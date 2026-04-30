export const codeSnippets = {
  cmakeLists: `cmake_minimum_required(VERSION 3.20)
project(WinFence VERSION 1.0.0 LANGUAGES CXX)

# ─── C++20 Standard ──────────────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ─── Static Runtime (standalone .exe) ────────────────────────────────────────
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

# ─── Source Files ────────────────────────────────────────────────────────────
set(SOURCES
    src/main.cpp
    src/core/Application.cpp
    src/core/FenceManager.cpp
    src/core/FenceWindow.cpp
    src/core/IconManager.cpp
    src/core/PersistenceManager.cpp
    src/ui/TrayIcon.cpp
    src/ui/ContextMenu.cpp
    src/shell/DesktopShell.cpp
    src/shell/ShellHook.cpp
    # ImGui sources (vendored)
    vendor/imgui/imgui.cpp
    vendor/imgui/imgui_draw.cpp
    vendor/imgui/imgui_tables.cpp
    vendor/imgui/imgui_widgets.cpp
    vendor/imgui/backends/imgui_impl_win32.cpp
    vendor/imgui/backends/imgui_impl_dx11.cpp
)

set(HEADERS
    src/core/Application.h
    src/core/FenceManager.h
    src/core/FenceWindow.h
    src/core/IconManager.h
    src/core/PersistenceManager.h
    src/ui/TrayIcon.h
    src/ui/ContextMenu.h
    src/shell/DesktopShell.h
    src/shell/ShellHook.h
    src/common/Types.h
    src/common/Logger.h
    src/common/Config.h
)

# ─── Resources (app icon, manifest) ──────────────────────────────────────────
set(RESOURCES
    resources/winfence.rc
    resources/winfence.manifest
)

add_executable(WinFence WIN32
    \${SOURCES}
    \${HEADERS}
    \${RESOURCES}
)

# ─── Include Directories ─────────────────────────────────────────────────────
target_include_directories(WinFence PRIVATE
    src/
    vendor/imgui/
    vendor/imgui/backends/
    vendor/nlohmann/   # nlohmann/json (header-only)
)

# ─── Link Libraries ──────────────────────────────────────────────────────────
target_link_libraries(WinFence PRIVATE
    dwmapi.lib        # DWM blur/transparency
    d3d11.lib         # DirectX 11 (ImGui renderer)
    dxgi.lib
    d3dcompiler.lib
    shell32.lib       # SHGetDesktopFolder, SHGetSpecialFolderPath
    ole32.lib         # COM initialization
    oleaut32.lib
    comctl32.lib      # Common controls
    uxtheme.lib       # Visual styles
    winmm.lib         # Multimedia timers
)

# ─── Compiler Flags ──────────────────────────────────────────────────────────
target_compile_definitions(WinFence PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    UNICODE
    _UNICODE
    _WIN32_WINNT=0x0A00   # Target Windows 10+
)

target_compile_options(WinFence PRIVATE
    /W4 /WX-           # High warnings, non-fatal
    /MP                # Multi-processor compilation
    /GS                # Buffer security check
    /guard:cf          # Control Flow Guard
    $<$<CONFIG:Release>:/O2 /GL /LTCG>
)

# ─── Link Options (Release: strip debug, LTCG) ───────────────────────────────
target_link_options(WinFence PRIVATE
    $<$<CONFIG:Release>:/LTCG /OPT:REF /OPT:ICF>
    /MANIFEST:EMBED
    /MANIFESTINPUT:resources/winfence.manifest
)

# ─── Output naming ───────────────────────────────────────────────────────────
set_target_properties(WinFence PROPERTIES
    OUTPUT_NAME "WinFence"
    RUNTIME_OUTPUT_DIRECTORY "\${CMAKE_BINARY_DIR}/bin"
)`,

  typesHeader: `#pragma once
// ─── src/common/Types.h ───────────────────────────────────────────────────────
// Core data types shared across the application.
// Using C++20 features: concepts, designated initializers, std::span, etc.

#include <windows.h>
#include <string>
#include <vector>
#include <optional>
#include <memory>
#include <functional>
#include <cstdint>

namespace WinFence {

// ─── Unique fence identifier ─────────────────────────────────────────────────
using FenceID = std::uint32_t;
inline constexpr FenceID INVALID_FENCE_ID = 0;

// ─── 2D integer point ────────────────────────────────────────────────────────
struct Point {
    int x = 0, y = 0;
    [[nodiscard]] bool operator==(const Point&) const noexcept = default;
};

// ─── Rectangle (screen coordinates) ─────────────────────────────────────────
struct Rect {
    int x = 0, y = 0, width = 0, height = 0;

    [[nodiscard]] bool Contains(Point p) const noexcept {
        return p.x >= x && p.x < x + width &&
               p.y >= y && p.y < y + height;
    }
    [[nodiscard]] bool Intersects(const Rect& o) const noexcept {
        return !(o.x > x + width  || o.x + o.width  < x ||
                 o.y > y + height || o.y + o.height < y);
    }
    [[nodiscard]] RECT ToWin32() const noexcept {
        return { (LONG)x, (LONG)y, (LONG)(x + width), (LONG)(y + height) };
    }
    static Rect FromWin32(const RECT& r) noexcept {
        return { (int)r.left, (int)r.top,
                 (int)(r.right - r.left), (int)(r.bottom - r.top) };
    }
};

// ─── RGBA colour (0.0–1.0 range for ImGui) ───────────────────────────────────
struct Color {
    float r = 0.3f, g = 0.3f, b = 0.3f, a = 0.55f;

    [[nodiscard]] ImVec4 ToImVec4() const noexcept { return {r, g, b, a}; }
    [[nodiscard]] COLORREF ToCOLORREF() const noexcept {
        return RGB((BYTE)(r*255), (BYTE)(g*255), (BYTE)(b*255));
    }
};

// ─── Desktop icon snapshot ───────────────────────────────────────────────────
struct DesktopIcon {
    std::wstring name;      // Display name (e.g., L"Recycle Bin")
    std::wstring path;      // Full filesystem path
    Point        position;  // Current position in desktop coords
    bool         selected = false;
    HICON        hIcon = nullptr;  // Small icon handle (16x16)
};

// ─── Persistent fence configuration ─────────────────────────────────────────
struct FenceConfig {
    FenceID            id          = INVALID_FENCE_ID;
    std::wstring       title       = L"New Fence";
    Rect               bounds      = {100, 100, 300, 200};
    Color              color       = {};
    float              titleBarH   = 28.0f;
    float              cornerRadius = 8.0f;
    bool               autoHide    = false;
    bool               locked      = false;
    std::vector<std::wstring> capturedIconPaths; // icons inside this fence
};

// ─── App-wide settings ───────────────────────────────────────────────────────
struct AppSettings {
    bool  startWithWindows  = true;
    bool  showInTaskbar     = false;
    float globalOpacity     = 0.55f;
    bool  blurEnabled       = true;
    bool  snapToGrid        = false;
    int   gridSize          = 16;
    std::wstring configPath;   // resolved at runtime
};

} // namespace WinFence`,

  fenceWindowHeader: `#pragma once
// ─── src/core/FenceWindow.h ───────────────────────────────────────────────────
// A "Fence" is a semi-transparent, blur-behind Win32 child window that
// sits between the desktop wallpaper and the shell icon ListView.

#include "common/Types.h"
#include <d3d11.h>
#include <imgui.h>
#include <imgui_impl_win32.h>
#include <imgui_impl_dx11.h>
#include <atomic>
#include <functional>

namespace WinFence {

// Callback types
using FenceMoveCallback   = std::function<void(FenceID, Rect)>;
using FenceResizeCallback = std::function<void(FenceID, Rect)>;
using FenceDeleteCallback = std::function<void(FenceID)>;

class FenceWindow {
public:
    // ── Lifecycle ─────────────────────────────────────────────────────────
    explicit FenceWindow(FenceConfig config,
                         ID3D11Device*        pDevice,
                         ID3D11DeviceContext* pContext);
    ~FenceWindow();

    // Non-copyable, movable
    FenceWindow(const FenceWindow&)            = delete;
    FenceWindow& operator=(const FenceWindow&) = delete;
    FenceWindow(FenceWindow&&)                 = default;

    // ── Core operations ───────────────────────────────────────────────────
    bool Create(HWND hDesktopParent);
    void Destroy();
    void RenderFrame();           // Called from the main render loop
    void Show(bool visible);
    void BringToDesktopLevel();   // Re-position behind shell icons

    // ── State accessors ───────────────────────────────────────────────────
    [[nodiscard]] FenceID     GetID()     const noexcept { return m_config.id; }
    [[nodiscard]] HWND        GetHWND()   const noexcept { return m_hwnd;      }
    [[nodiscard]] const Rect& GetBounds() const noexcept { return m_config.bounds; }
    [[nodiscard]] bool        IsVisible() const noexcept { return m_visible;   }
    [[nodiscard]] const FenceConfig& GetConfig() const noexcept { return m_config; }

    // ── Mutation ─────────────────────────────────────────────────────────
    void SetTitle(std::wstring_view title);
    void SetBounds(const Rect& r);
    void SetColor(const Color& c);
    void SetOpacity(float opacity);
    void AddIcon(const DesktopIcon& icon);
    void RemoveIcon(std::wstring_view path);

    // ── Event callbacks ───────────────────────────────────────────────────
    void OnMove(FenceMoveCallback cb)     { m_onMove = std::move(cb); }
    void OnResize(FenceResizeCallback cb) { m_onResize = std::move(cb); }
    void OnDelete(FenceDeleteCallback cb) { m_onDelete = std::move(cb); }

private:
    // ── Win32 window procedure ────────────────────────────────────────────
    static LRESULT CALLBACK StaticWndProc(HWND, UINT, WPARAM, LPARAM);
    LRESULT WndProc(HWND, UINT, WPARAM, LPARAM);

    // ── Rendering helpers ─────────────────────────────────────────────────
    void SetupDWMBlur();
    void RenderTitleBar(ImDrawList* dl, const ImVec2& pos, const ImVec2& size);
    void RenderResizeHandles(ImDrawList* dl, const ImVec2& pos, const ImVec2& size);
    void RenderIconGrid();
    void HandleDragLogic();

    // ── Hit-test helpers ─────────────────────────────────────────────────
    bool IsInTitleBar(POINT pt) const noexcept;
    bool IsInResizeCorner(POINT pt) const noexcept;

    // ── Data members ──────────────────────────────────────────────────────
    FenceConfig          m_config;
    HWND                 m_hwnd        = nullptr;
    HWND                 m_hDesktop    = nullptr;   // WorkerW parent
    bool                 m_visible     = true;

    // DX11 swap chain per fence window
    IDXGISwapChain*          m_pSwapChain     = nullptr;
    ID3D11RenderTargetView*  m_pRenderTarget  = nullptr;
    ID3D11Device*            m_pDevice        = nullptr;  // shared (non-owning)
    ID3D11DeviceContext*     m_pContext        = nullptr;  // shared (non-owning)

    // ImGui per-window context
    ImGuiContext*            m_imguiCtx       = nullptr;

    // Interaction state
    bool  m_isDragging     = false;
    bool  m_isResizing     = false;
    POINT m_dragStartMouse = {};
    Rect  m_dragStartRect  = {};

    // Callbacks
    FenceMoveCallback   m_onMove;
    FenceResizeCallback m_onResize;
    FenceDeleteCallback m_onDelete;

    // Captured icons
    std::vector<DesktopIcon> m_icons;

    static constexpr int RESIZE_HANDLE_SIZE = 12;
    static constexpr int MIN_WIDTH          = 120;
    static constexpr int MIN_HEIGHT         = 80;
};

} // namespace WinFence`,

  fenceWindowImpl: `// ─── src/core/FenceWindow.cpp ────────────────────────────────────────────────
// Core implementation of a single semi-transparent "Fence" window.
// Uses Win32 layered windows + DWM blur-behind + ImGui for the UI overlay.

#include "core/FenceWindow.h"
#include "shell/DesktopShell.h"
#include "common/Logger.h"
#include <dwmapi.h>
#include <stdexcept>
#include <format>   // C++20

#pragma comment(lib, "dwmapi.lib")

namespace WinFence {

// ─── Class name for all fence windows ────────────────────────────────────────
static constexpr LPCWSTR FENCE_CLASS_NAME = L"WinFence_FenceWindow";

// ─── Register window class (once) ────────────────────────────────────────────
static bool s_classRegistered = false;
static void RegisterFenceClass(HINSTANCE hInst) {
    if (s_classRegistered) return;
    WNDCLASSEXW wc{};
    wc.cbSize        = sizeof(wc);
    wc.lpfnWndProc   = FenceWindow::StaticWndProc;
    wc.hInstance     = hInst;
    wc.lpszClassName = FENCE_CLASS_NAME;
    wc.hCursor       = LoadCursor(nullptr, IDC_ARROW);
    // No background brush → we paint everything via ImGui/DX11
    if (!RegisterClassExW(&wc))
        throw std::runtime_error("Failed to register FenceWindow class");
    s_classRegistered = true;
}

// ─── Constructor / Destructor ─────────────────────────────────────────────────
FenceWindow::FenceWindow(FenceConfig config,
                         ID3D11Device*        pDevice,
                         ID3D11DeviceContext* pContext)
    : m_config(std::move(config))
    , m_pDevice(pDevice)
    , m_pContext(pContext)
{}

FenceWindow::~FenceWindow() {
    Destroy();
}

// ─── Create the Win32 window ─────────────────────────────────────────────────
bool FenceWindow::Create(HWND hDesktopParent) {
    m_hDesktop = hDesktopParent;
    auto hInst = GetModuleHandleW(nullptr);
    RegisterFenceClass(hInst);

    // WS_EX_LAYERED  → supports per-pixel alpha / transparency
    // WS_EX_NOACTIVATE → clicking the fence doesn't steal focus from desktop
    // WS_EX_TOOLWINDOW → hidden from Alt+Tab
    DWORD exStyle = WS_EX_LAYERED | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW;
    DWORD style   = WS_POPUP;

    auto& b = m_config.bounds;
    m_hwnd = CreateWindowExW(
        exStyle, FENCE_CLASS_NAME,
        L"",          // fences have no Win32 title bar
        style,
        b.x, b.y, b.width, b.height,
        nullptr,      // no Win32 parent (sits in desktop Z-order)
        nullptr, hInst,
        this          // pass 'this' for WM_NCCREATE retrieval
    );

    if (!m_hwnd) {
        LOG_ERROR("CreateWindowEx failed: {}", GetLastError());
        return false;
    }

    // ── DWM: extend frame = true glass across entire client area ──────────
    SetupDWMBlur();

    // ── Per-pixel alpha: LWA_ALPHA lets DWM handle compositing ───────────
    SetLayeredWindowAttributes(m_hwnd, 0, 255, LWA_ALPHA);

    // ── Create DXGI swap chain for this window ───────────────────────────
    DXGI_SWAP_CHAIN_DESC sd{};
    sd.BufferCount                        = 2;
    sd.BufferDesc.Width                   = (UINT)b.width;
    sd.BufferDesc.Height                  = (UINT)b.height;
    sd.BufferDesc.Format                  = DXGI_FORMAT_R8G8B8A8_UNORM;
    sd.BufferDesc.RefreshRate.Numerator   = 60;
    sd.BufferDesc.RefreshRate.Denominator = 1;
    sd.Flags                              = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    sd.BufferUsage                        = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    sd.OutputWindow                       = m_hwnd;
    sd.SampleDesc.Count                   = 1;
    sd.Windowed                           = TRUE;
    sd.SwapEffect                         = DXGI_SWAP_EFFECT_DISCARD;

    IDXGIDevice*  dxgiDevice  = nullptr;
    IDXGIAdapter* dxgiAdapter = nullptr;
    IDXGIFactory* dxgiFactory = nullptr;
    m_pDevice->QueryInterface(__uuidof(IDXGIDevice),  (void**)&dxgiDevice);
    dxgiDevice->GetAdapter(&dxgiAdapter);
    dxgiAdapter->GetParent(__uuidof(IDXGIFactory), (void**)&dxgiFactory);
    dxgiFactory->CreateSwapChain(m_pDevice, &sd, &m_pSwapChain);
    dxgiFactory->Release(); dxgiAdapter->Release(); dxgiDevice->Release();

    // ── Render target view ───────────────────────────────────────────────
    ID3D11Texture2D* pBackBuffer = nullptr;
    m_pSwapChain->GetBuffer(0, __uuidof(ID3D11Texture2D), (void**)&pBackBuffer);
    m_pDevice->CreateRenderTargetView(pBackBuffer, nullptr, &m_pRenderTarget);
    pBackBuffer->Release();

    // ── Per-fence ImGui context ──────────────────────────────────────────
    m_imguiCtx = ImGui::CreateContext();
    ImGui::SetCurrentContext(m_imguiCtx);
    ImGui_ImplWin32_Init(m_hwnd);
    ImGui_ImplDX11_Init(m_pDevice, m_pContext);

    // Style: frameless, no rounding collision with our custom drawing
    ImGuiStyle& style_ref = ImGui::GetStyle();
    style_ref.WindowRounding = m_config.cornerRadius;
    style_ref.WindowPadding  = {8, 8};
    style_ref.Alpha          = m_config.color.a;

    // ── Position behind shell icon ListView ───────────────────────────────
    BringToDesktopLevel();

    ShowWindow(m_hwnd, SW_SHOWNA);   // Show without activating
    UpdateWindow(m_hwnd);

    LOG_INFO("FenceWindow created: id={}, title={}",
             m_config.id, m_config.title);
    return true;
}

// ─── Enable DWM Blur-Behind ───────────────────────────────────────────────────
void FenceWindow::SetupDWMBlur() {
    // Negative margins = "sheet of glass" = entire client area is DWM-composited
    MARGINS margins = {-1};
    DwmExtendFrameIntoClientArea(m_hwnd, &margins);

    // Optional: Windows 10 Acrylic / Blur effect via undocumented SetWindowCompositionAttribute
    // (gracefully ignored on older OS)
    struct ACCENTPOLICY {
        DWORD AccentState;   // 3 = ACCENT_ENABLE_BLURBEHIND
        DWORD AccentFlags;
        DWORD GradientColor; // AABBGGRR
        DWORD AnimationId;
    };
    struct WINCOMPATTRDATA {
        DWORD   Attribute;  // 19 = WCA_ACCENT_POLICY
        PVOID   Data;
        ULONG   SizeOfData;
    };

    using pfnSetWindowCompositionAttribute =
        BOOL(WINAPI*)(HWND, WINCOMPATTRDATA*);

    auto hUser32 = GetModuleHandleW(L"user32.dll");
    auto fn = reinterpret_cast<pfnSetWindowCompositionAttribute>(
        GetProcAddress(hUser32, "SetWindowCompositionAttribute"));

    if (fn) {
        DWORD gradientColor =
            (DWORD)(m_config.color.a * 255) << 24 |
            (DWORD)(m_config.color.b * 255) << 16 |
            (DWORD)(m_config.color.g * 255) <<  8 |
            (DWORD)(m_config.color.r * 255);

        ACCENTPOLICY policy = {3, 0, gradientColor, 0};
        WINCOMPATTRDATA data = {19, &policy, sizeof(policy)};
        fn(m_hwnd, &data);
    }
}

// ─── Render one frame ─────────────────────────────────────────────────────────
void FenceWindow::RenderFrame() {
    if (!m_visible || !m_hwnd) return;

    ImGui::SetCurrentContext(m_imguiCtx);
    ImGui_ImplDX11_NewFrame();
    ImGui_ImplWin32_NewFrame();
    ImGui::NewFrame();

    auto& b = m_config.bounds;
    ImGui::SetNextWindowPos({0.0f, 0.0f});
    ImGui::SetNextWindowSize({(float)b.width, (float)b.height});
    ImGui::SetNextWindowBgAlpha(0.0f);  // DWM handles the background

    ImGuiWindowFlags flags =
        ImGuiWindowFlags_NoTitleBar         |
        ImGuiWindowFlags_NoScrollbar        |
        ImGuiWindowFlags_NoMove             |
        ImGuiWindowFlags_NoSavedSettings    |
        ImGuiWindowFlags_NoBringToDisplayOnFocus;

    ImGui::Begin("##fence", nullptr, flags);
    {
        ImDrawList* dl   = ImGui::GetWindowDrawList();
        ImVec2      wPos = ImGui::GetWindowPos();
        ImVec2      wSz  = ImGui::GetWindowSize();

        // ── 1. Background fill (semi-transparent) ────────────────────────
        ImU32 bgColor = IM_COL32(
            (int)(m_config.color.r * 255),
            (int)(m_config.color.g * 255),
            (int)(m_config.color.b * 255),
            (int)(m_config.color.a * 255)
        );
        dl->AddRectFilled(wPos,
            {wPos.x + wSz.x, wPos.y + wSz.y},
            bgColor, m_config.cornerRadius);

        // ── 2. Border glow ───────────────────────────────────────────────
        dl->AddRect(wPos,
            {wPos.x + wSz.x, wPos.y + wSz.y},
            IM_COL32(255, 255, 255, 40),
            m_config.cornerRadius, 0, 1.5f);

        // ── 3. Title bar ─────────────────────────────────────────────────
        RenderTitleBar(dl, wPos, wSz);

        // ── 4. Icons grid ────────────────────────────────────────────────
        RenderIconGrid();

        // ── 5. Resize handles ────────────────────────────────────────────
        RenderResizeHandles(dl, wPos, wSz);

        // ── 6. Drag logic ────────────────────────────────────────────────
        HandleDragLogic();
    }
    ImGui::End();

    ImGui::Render();

    // Clear with transparent black → DWM composites blur behind
    const float clearColor[4] = {0.0f, 0.0f, 0.0f, 0.0f};
    m_pContext->OMSetRenderTargets(1, &m_pRenderTarget, nullptr);
    m_pContext->ClearRenderTargetView(m_pRenderTarget, clearColor);
    ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());

    m_pSwapChain->Present(1, 0);  // VSync
}

// ─── Title bar rendering ──────────────────────────────────────────────────────
void FenceWindow::RenderTitleBar(ImDrawList* dl,
                                  const ImVec2& pos, const ImVec2& sz) {
    float h = m_config.titleBarH;
    // Darker strip at top
    dl->AddRectFilled(pos,
        {pos.x + sz.x, pos.y + h},
        IM_COL32(0, 0, 0, 80),
        m_config.cornerRadius,
        ImDrawFlags_RoundCornersTop);

    // Separator line
    dl->AddLine({pos.x, pos.y + h},
                {pos.x + sz.x, pos.y + h},
                IM_COL32(255, 255, 255, 30), 1.0f);

    // Title text
    std::string narrow(m_config.title.begin(), m_config.title.end());
    dl->AddText(ImGui::GetFont(), 13.0f,
        {pos.x + 10, pos.y + (h - 13.0f) * 0.5f},
        IM_COL32(255, 255, 255, 200),
        narrow.c_str());

    // Close button (×)
    ImVec2 closePos = {pos.x + sz.x - 22, pos.y + (h - 14) * 0.5f};
    ImGui::SetCursorPos({sz.x - 24, (h - 16) * 0.5f});
    if (ImGui::InvisibleButton("##close", {16, 16})) {
        if (m_onDelete) m_onDelete(m_config.id);
    }
    ImU32 closeColor = ImGui::IsItemHovered()
        ? IM_COL32(220, 60, 60, 220)
        : IM_COL32(255, 255, 255, 100);
    dl->AddText(nullptr, 14.0f, closePos, closeColor, "x");
}

// ─── Icon grid ───────────────────────────────────────────────────────────────
void FenceWindow::RenderIconGrid() {
    float titleH = m_config.titleBarH;
    ImGui::SetCursorPos({8.0f, titleH + 6.0f});
    ImGui::BeginGroup();
    for (auto& icon : m_icons) {
        std::string name(icon.name.begin(), icon.name.end());
        ImGui::BeginGroup();
        ImGui::Dummy({48, 48}); // placeholder for icon image
        float textW = ImGui::CalcTextSize(name.c_str()).x;
        ImGui::SetCursorPosX(ImGui::GetCursorPosX() + (48 - textW) * 0.5f);
        ImGui::TextUnformatted(name.c_str());
        ImGui::EndGroup();
        ImGui::SameLine(0, 8);
    }
    ImGui::EndGroup();
}`,

  shellHookHeader: `#pragma once
// ─── src/shell/ShellHook.h ────────────────────────────────────────────────────
// Monitors the desktop's ListView for icon position changes using:
//   1. SetWinEventHook (EVENT_OBJECT_LOCATIONCHANGE) – preferred, in-process
//   2. Shell_NotifyIcon message sub-classing for tray events
//   3. Polling fallback (low-frequency timer) for missed moves

#include "common/Types.h"
#include <functional>
#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include <windows.h>

namespace WinFence {

// Fired when a desktop icon's position changes
using IconMoveCallback = std::function<void(
    const std::wstring& iconPath,
    Point               oldPos,
    Point               newPos
)>;

// Fired when icons are added/removed from the desktop
using IconChangeCallback = std::function<void(
    const std::vector<DesktopIcon>& currentSnapshot
)>;

class ShellHook {
public:
    ShellHook();
    ~ShellHook();

    // ── Hook lifecycle ────────────────────────────────────────────────────
    bool Install();
    void Uninstall();
    [[nodiscard]] bool IsInstalled() const noexcept { return m_installed; }

    // ── Callbacks ─────────────────────────────────────────────────────────
    void SetIconMoveCallback(IconMoveCallback cb)     { m_onIconMove = std::move(cb); }
    void SetIconChangeCallback(IconChangeCallback cb) { m_onIconChange = std::move(cb); }

    // ── Manual snapshot (called periodically) ────────────────────────────
    [[nodiscard]] std::vector<DesktopIcon> SnapshotDesktopIcons() const;

private:
    // ─── WinEvent hook callback (static dispatch) ─────────────────────────
    static void CALLBACK WinEventProc(
        HWINEVENTHOOK hHook, DWORD event,
        HWND hwnd, LONG idObject, LONG idChild,
        DWORD dwEventThread, DWORD dwmsEventTime);

    void OnLocationChange(HWND hwnd, LONG idObject, LONG idChild);

    // ─── Internal snapshot utility ───────────────────────────────────────
    [[nodiscard]] HWND  FindDesktopListView() const noexcept;
    [[nodiscard]] Point GetIconPositionByIndex(HWND hLV, int index) const;
    [[nodiscard]] std::wstring GetIconNameByIndex(HWND hLV, int index) const;

    // ─── Polling thread (fallback) ───────────────────────────────────────
    void PollingThreadProc();

    // ─── Members ─────────────────────────────────────────────────────────
    HWINEVENTHOOK             m_hEventHook  = nullptr;
    bool                      m_installed   = false;

    IconMoveCallback          m_onIconMove;
    IconChangeCallback        m_onIconChange;

    std::vector<DesktopIcon>  m_lastSnapshot;
    mutable std::mutex        m_snapshotMutex;

    std::thread               m_pollingThread;
    std::atomic<bool>         m_stopPolling{false};

    // Singleton access (WinEvent hook needs static context)
    static ShellHook*         s_instance;
};

} // namespace WinFence`,

  shellHookImpl: `// ─── src/shell/ShellHook.cpp ─────────────────────────────────────────────────
// Implementation of the three-layer icon-move detection system.
//
// ARCHITECTURE OVERVIEW:
// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — WinEventHook (EVENT_OBJECT_LOCATIONCHANGE)
//   • SetWinEventHook registers an in-process event hook on the desktop
//     ListView (SysListView32). When Windows fires EVENT_OBJECT_LOCATIONCHANGE
//     for idObject=OBJID_CLIENT and the hwnd matches our ListView, we know
//     an icon moved.
//   • We then use LVM_GETITEMPOSITION via SendMessage to get new coords.
//   • This runs on the main thread (hook callback is on the hook's thread).
//
// Layer 2 — Cross-process ListView interrogation (ReadProcessMemory)
//   • The desktop ListView lives in explorer.exe. LVM_GETITEMPOSITION returns
//     a POINT written into a buffer in the REMOTE process. We must:
//     a) VirtualAllocEx in explorer.exe
//     b) SendMessage(LVM_GETITEMPOSITION, ..., remotePtr)
//     c) ReadProcessMemory back into our local POINT
//     d) VirtualFreeEx
//   • We use PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION.
//
// Layer 3 — Polling fallback (250ms timer)
//   • A background thread snapshots all icon positions every 250ms.
//   • Diffs against the previous snapshot to fire move callbacks.
//   • Catches edge cases missed by WinEvent (e.g., icon auto-arrange).

#include "shell/ShellHook.h"
#include "common/Logger.h"
#include <commctrl.h>
#include <shlobj.h>
#include <chrono>
#include <algorithm>

namespace WinFence {

ShellHook* ShellHook::s_instance = nullptr;

ShellHook::ShellHook() {
    s_instance = this;
}

ShellHook::~ShellHook() {
    Uninstall();
    s_instance = nullptr;
}

// ─── Install all hooks ────────────────────────────────────────────────────────
bool ShellHook::Install() {
    if (m_installed) return true;

    HWND hLV = FindDesktopListView();
    if (!hLV) {
        LOG_WARN("Could not find desktop ListView, falling back to polling only");
    }

    // ── Layer 1: WinEventHook ─────────────────────────────────────────────
    if (hLV) {
        DWORD explorerPid = 0;
        GetWindowThreadProcessId(hLV, &explorerPid);

        // WINEVENT_OUTOFCONTEXT: hook runs in OUR process (no DLL injection)
        // Covers object location changes in the desktop ListView
        m_hEventHook = SetWinEventHook(
            EVENT_OBJECT_LOCATIONCHANGE,  // eventMin
            EVENT_OBJECT_LOCATIONCHANGE,  // eventMax
            nullptr,                      // hmodWinEventProc (NULL = out-of-process)
            WinEventProc,                 // callback
            explorerPid,                  // filter to explorer.exe
            0,                            // all threads in explorer
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS
        );

        if (!m_hEventHook) {
            LOG_WARN("SetWinEventHook failed: {}", GetLastError());
        } else {
            LOG_INFO("WinEventHook installed on explorer.exe PID={}", explorerPid);
        }
    }

    // ── Initial snapshot ──────────────────────────────────────────────────
    {
        std::lock_guard lock(m_snapshotMutex);
        m_lastSnapshot = SnapshotDesktopIcons();
    }

    // ── Layer 3: Polling fallback thread ──────────────────────────────────
    m_stopPolling.store(false);
    m_pollingThread = std::thread([this] { PollingThreadProc(); });

    m_installed = true;
    LOG_INFO("ShellHook: all layers installed");
    return true;
}

// ─── Uninstall all hooks ──────────────────────────────────────────────────────
void ShellHook::Uninstall() {
    if (!m_installed) return;

    m_stopPolling.store(true);
    if (m_pollingThread.joinable())
        m_pollingThread.join();

    if (m_hEventHook) {
        UnhookWinEvent(m_hEventHook);
        m_hEventHook = nullptr;
    }

    m_installed = false;
}

// ─── WinEvent static callback (dispatches to instance) ───────────────────────
void CALLBACK ShellHook::WinEventProc(
    HWINEVENTHOOK /*hHook*/, DWORD event,
    HWND hwnd, LONG idObject, LONG idChild,
    DWORD /*dwEventThread*/, DWORD /*dwmsEventTime*/)
{
    if (s_instance && event == EVENT_OBJECT_LOCATIONCHANGE)
        s_instance->OnLocationChange(hwnd, idObject, idChild);
}

// ─── Handle a location-change event ──────────────────────────────────────────
void ShellHook::OnLocationChange(HWND hwnd, LONG idObject, LONG idChild) {
    // We only care about child items (icons) in the desktop ListView
    if (idObject != OBJID_CLIENT || idChild <= 0) return;

    HWND hLV = FindDesktopListView();
    if (!hLV || hwnd != hLV) return;

    int iconIndex = idChild - 1;  // OBJID child indices are 1-based
    Point newPos  = GetIconPositionByIndex(hLV, iconIndex);
    auto  name    = GetIconNameByIndex(hLV, iconIndex);

    // Find old position from snapshot
    std::lock_guard lock(m_snapshotMutex);
    auto it = std::find_if(m_lastSnapshot.begin(), m_lastSnapshot.end(),
        [&](const DesktopIcon& ic) { return ic.name == name; });

    Point oldPos = (it != m_lastSnapshot.end()) ? it->position : newPos;

    if (newPos.x != oldPos.x || newPos.y != oldPos.y) {
        if (m_onIconMove)
            m_onIconMove(name, oldPos, newPos);

        if (it != m_lastSnapshot.end())
            it->position = newPos;
    }
}

// ─── Find the shell desktop ListView ─────────────────────────────────────────
// Explorer creates the desktop like this:
//   Progman → SHELLDLL_DefView → SysListView32   (classic)
//   Progman → WorkerW         (animated wallpaper video)
//     └─ WorkerW → SHELLDLL_DefView → SysListView32
//
// We walk both paths.
HWND ShellHook::FindDesktopListView() const noexcept {
    // Try classic Progman path first
    HWND hProgman = FindWindowW(L"Progman", nullptr);
    HWND hShellView = FindWindowExW(hProgman, nullptr,
                                    L"SHELLDLL_DefView", nullptr);
    if (hShellView) {
        HWND hLV = FindWindowExW(hShellView, nullptr,
                                  L"SysListView32", nullptr);
        if (hLV) return hLV;
    }

    // Walk WorkerW windows (live wallpaper or Win11)
    HWND hWorker = nullptr;
    while ((hWorker = FindWindowExW(nullptr, hWorker,
                                     L"WorkerW", nullptr)) != nullptr) {
        hShellView = FindWindowExW(hWorker, nullptr,
                                    L"SHELLDLL_DefView", nullptr);
        if (hShellView) {
            HWND hLV = FindWindowExW(hShellView, nullptr,
                                      L"SysListView32", nullptr);
            if (hLV) return hLV;
        }
    }
    return nullptr;
}

// ─── Cross-process LVM_GETITEMPOSITION ───────────────────────────────────────
// The ListView lives in explorer.exe's address space. We must allocate
// a POINT in the remote process, send the message, then read it back.
Point ShellHook::GetIconPositionByIndex(HWND hLV, int index) const {
    DWORD explorerPid = 0;
    GetWindowThreadProcessId(hLV, &explorerPid);

    HANDLE hProcess = OpenProcess(
        PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION,
        FALSE, explorerPid);
    if (!hProcess) return {};

    // Allocate remote POINT
    LPVOID remotePoint = VirtualAllocEx(hProcess, nullptr,
                                         sizeof(POINT),
                                         MEM_COMMIT, PAGE_READWRITE);
    if (!remotePoint) { CloseHandle(hProcess); return {}; }

    // Ask the ListView to write the icon position into remotePoint
    SendMessageW(hLV, LVM_GETITEMPOSITION,
                 (WPARAM)index, (LPARAM)remotePoint);

    // Read it back
    POINT localPoint{};
    ReadProcessMemory(hProcess, remotePoint,
                      &localPoint, sizeof(POINT), nullptr);

    VirtualFreeEx(hProcess, remotePoint, 0, MEM_RELEASE);
    CloseHandle(hProcess);

    return {(int)localPoint.x, (int)localPoint.y};
}

// ─── Snapshot all desktop icons ───────────────────────────────────────────────
std::vector<DesktopIcon> ShellHook::SnapshotDesktopIcons() const {
    std::vector<DesktopIcon> result;
    HWND hLV = FindDesktopListView();
    if (!hLV) return result;

    int count = (int)SendMessageW(hLV, LVM_GETITEMCOUNT, 0, 0);
    result.reserve(count);

    for (int i = 0; i < count; ++i) {
        DesktopIcon icon;
        icon.name     = GetIconNameByIndex(hLV, i);
        icon.position = GetIconPositionByIndex(hLV, i);
        result.push_back(std::move(icon));
    }
    return result;
}

// ─── Polling fallback ─────────────────────────────────────────────────────────
void ShellHook::PollingThreadProc() {
    using namespace std::chrono_literals;
    while (!m_stopPolling.load()) {
        std::this_thread::sleep_for(250ms);

        auto current = SnapshotDesktopIcons();

        std::lock_guard lock(m_snapshotMutex);
        // Check for moves
        for (auto& cur : current) {
            auto it = std::find_if(m_lastSnapshot.begin(), m_lastSnapshot.end(),
                [&](const DesktopIcon& ic) { return ic.name == cur.name; });
            if (it != m_lastSnapshot.end() &&
                (it->position.x != cur.position.x ||
                 it->position.y != cur.position.y))
            {
                if (m_onIconMove)
                    m_onIconMove(cur.name, it->position, cur.position);
            }
        }

        // Check for add/remove
        if (current.size() != m_lastSnapshot.size()) {
            if (m_onIconChange) m_onIconChange(current);
        }

        m_lastSnapshot = std::move(current);
    }
}

} // namespace WinFence`,

  persistenceManager: `#pragma once
// ─── src/core/PersistenceManager.h ───────────────────────────────────────────
// Saves/loads fence configurations to/from JSON using nlohmann/json.
// File location: %APPDATA%\\WinFence\\fences.json

#include "common/Types.h"
#include <nlohmann/json.hpp>
#include <filesystem>
#include <vector>
#include <expected>  // C++23 (or use std::optional + error code)

namespace WinFence {

using json = nlohmann::json;
namespace fs = std::filesystem;

class PersistenceManager {
public:
    explicit PersistenceManager(fs::path configDir);

    // Load all fence configs; returns empty vector on first run
    [[nodiscard]] std::vector<FenceConfig> LoadFences() const;

    // Save all fence configs atomically (write to .tmp, then rename)
    bool SaveFences(const std::vector<FenceConfig>& fences) const;

    // Load / Save app settings
    [[nodiscard]] AppSettings LoadSettings() const;
    bool SaveSettings(const AppSettings& settings) const;

    [[nodiscard]] const fs::path& GetConfigDir() const noexcept { return m_dir; }

private:
    fs::path m_dir;
    fs::path m_fencesFile;
    fs::path m_settingsFile;

    // ── JSON (de)serialisation helpers ────────────────────────────────────
    static json FenceToJson(const FenceConfig& f);
    static FenceConfig JsonToFence(const json& j);
    static json SettingsToJson(const AppSettings& s);
    static AppSettings JsonToSettings(const json& j);
};

// ─── Implementation (inlined for brevity) ────────────────────────────────────

inline PersistenceManager::PersistenceManager(fs::path configDir)
    : m_dir(std::move(configDir))
    , m_fencesFile(m_dir / "fences.json")
    , m_settingsFile(m_dir / "settings.json")
{
    fs::create_directories(m_dir);
}

inline std::vector<FenceConfig> PersistenceManager::LoadFences() const {
    if (!fs::exists(m_fencesFile)) return {};
    try {
        std::ifstream f(m_fencesFile);
        auto j = json::parse(f);
        std::vector<FenceConfig> result;
        for (auto& item : j["fences"])
            result.push_back(JsonToFence(item));
        return result;
    } catch (const std::exception& e) {
        LOG_ERROR("LoadFences failed: {}", e.what());
        return {};
    }
}

inline bool PersistenceManager::SaveFences(
    const std::vector<FenceConfig>& fences) const
{
    json j;
    j["version"] = 1;
    j["fences"]  = json::array();
    for (auto& f : fences)
        j["fences"].push_back(FenceToJson(f));

    // Atomic write: write to .tmp then rename (avoids corruption on crash)
    auto tmp = m_fencesFile;
    tmp += ".tmp";
    try {
        { std::ofstream out(tmp); out << j.dump(2); }
        fs::rename(tmp, m_fencesFile);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("SaveFences failed: {}", e.what());
        fs::remove(tmp);
        return false;
    }
}

inline json PersistenceManager::FenceToJson(const FenceConfig& f) {
    return {
        {"id",            f.id},
        {"title",         std::string(f.title.begin(), f.title.end())},
        {"x",             f.bounds.x},
        {"y",             f.bounds.y},
        {"width",         f.bounds.width},
        {"height",        f.bounds.height},
        {"color_r",       f.color.r},
        {"color_g",       f.color.g},
        {"color_b",       f.color.b},
        {"color_a",       f.color.a},
        {"title_bar_h",   f.titleBarH},
        {"corner_radius", f.cornerRadius},
        {"auto_hide",     f.autoHide},
        {"locked",        f.locked},
        {"icons",         f.capturedIconPaths}  // std::vector serialises natively
    };
}

inline FenceConfig PersistenceManager::JsonToFence(const json& j) {
    FenceConfig f;
    f.id            = j.at("id").get<FenceID>();
    auto t          = j.at("title").get<std::string>();
    f.title         = std::wstring(t.begin(), t.end());
    f.bounds.x      = j.at("x").get<int>();
    f.bounds.y      = j.at("y").get<int>();
    f.bounds.width  = j.at("width").get<int>();
    f.bounds.height = j.at("height").get<int>();
    f.color.r       = j.at("color_r").get<float>();
    f.color.g       = j.at("color_g").get<float>();
    f.color.b       = j.at("color_b").get<float>();
    f.color.a       = j.at("color_a").get<float>();
    f.titleBarH     = j.at("title_bar_h").get<float>();
    f.cornerRadius  = j.at("corner_radius").get<float>();
    f.autoHide      = j.at("auto_hide").get<bool>();
    f.locked        = j.at("locked").get<bool>();
    f.capturedIconPaths = j.at("icons").get<std::vector<std::wstring>>();
    return f;
}

} // namespace WinFence`,

  mainEntry: `// ─── src/main.cpp ────────────────────────────────────────────────────────────
// WinFence — Windows Desktop Organizer
// Entry point: initializes COM, creates the Application, runs the message loop.
//
// Subsystem: WINDOWS (no console window) → WinMain signature required.

#include "core/Application.h"
#include "common/Logger.h"

#include <windows.h>
#include <objbase.h>    // CoInitializeEx
#include <stdexcept>

// ─── Entry point ─────────────────────────────────────────────────────────────
int WINAPI WinMain(
    _In_     HINSTANCE hInstance,
    _In_opt_ HINSTANCE /*hPrevInstance*/,
    _In_     LPSTR     /*lpCmdLine*/,
    _In_     int       /*nCmdShow*/)
{
    // ── Single-instance guard (named mutex) ──────────────────────────────
    HANDLE hMutex = CreateMutexW(nullptr, TRUE, L"WinFence_SingleInstance");
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        // Find the existing window and show its tray icon balloon
        HWND hExisting = FindWindowW(L"WinFence_Hidden", nullptr);
        if (hExisting) PostMessageW(hExisting, WM_USER + 1, 0, 0);
        CloseHandle(hMutex);
        return 0;
    }

    // ── COM (needed for shell IShellFolder, IEnumIDList) ─────────────────
    HRESULT hr = CoInitializeEx(nullptr,
                                 COINIT_APARTMENTTHREADED |
                                 COINIT_DISABLE_OLE1DDE);
    if (FAILED(hr)) {
        MessageBoxW(nullptr,
            L"Failed to initialize COM. WinFence cannot start.",
            L"WinFence Error", MB_ICONERROR);
        return 1;
    }

    // ── Logger ────────────────────────────────────────────────────────────
    Logger::Init(Logger::Level::Info, L"%APPDATA%\\\\WinFence\\\\winfence.log");

    // ── Application ───────────────────────────────────────────────────────
    int exitCode = 0;
    try {
        WinFence::Application app(hInstance);
        if (app.Initialize()) {
            exitCode = app.RunMessageLoop();
        }
        app.Shutdown();
    } catch (const std::exception& ex) {
        LOG_FATAL("Unhandled exception: {}", ex.what());
        MessageBoxA(nullptr, ex.what(),
                    "WinFence Fatal Error", MB_ICONERROR);
        exitCode = -1;
    }

    CoUninitialize();
    ReleaseMutex(hMutex);
    CloseHandle(hMutex);
    return exitCode;
}`,

  applicationHeader: `#pragma once
// ─── src/core/Application.h ───────────────────────────────────────────────────
// Top-level application controller. Owns:
//   • DirectX 11 device (shared across fence windows)
//   • FenceManager  (CRUD for fence windows)
//   • ShellHook     (icon position monitoring)
//   • PersistenceManager (save/load fences.json)
//   • TrayIcon      (system tray presence)

#include "common/Types.h"
#include "core/FenceManager.h"
#include "core/PersistenceManager.h"
#include "shell/ShellHook.h"
#include "ui/TrayIcon.h"

#include <d3d11.h>
#include <windows.h>
#include <memory>

namespace WinFence {

class Application {
public:
    explicit Application(HINSTANCE hInst);
    ~Application();

    bool Initialize();
    int  RunMessageLoop();
    void Shutdown();

private:
    // ── Setup ─────────────────────────────────────────────────────────────
    bool InitDirectX();
    bool InitShellIntegration();
    bool LoadPersistedFences();
    void SetupHiddenMessageWindow();

    // ── Win32 message handling ────────────────────────────────────────────
    static LRESULT CALLBACK HiddenWndProc(HWND, UINT, WPARAM, LPARAM);
    LRESULT HandleMessage(HWND, UINT, WPARAM, LPARAM);

    // ── Save / restore ────────────────────────────────────────────────────
    void OnSaveTimer();
    void OnDesktopDoubleClick();   // toggle hide/show all fences

    // ── Members ───────────────────────────────────────────────────────────
    HINSTANCE m_hInst;
    HWND      m_hHiddenWnd = nullptr;  // receives global messages (tray, etc.)

    // DirectX shared device
    ID3D11Device*        m_pDevice  = nullptr;
    ID3D11DeviceContext* m_pContext = nullptr;

    std::unique_ptr<FenceManager>       m_fenceManager;
    std::unique_ptr<ShellHook>          m_shellHook;
    std::unique_ptr<PersistenceManager> m_persistence;
    std::unique_ptr<TrayIcon>           m_trayIcon;

    AppSettings m_settings;
    bool        m_allHidden = false;

    // Auto-save: every 30 seconds
    static constexpr UINT SAVE_TIMER_ID  = 1001;
    static constexpr UINT SAVE_INTERVAL  = 30000; // ms
};

} // namespace WinFence`,
};
