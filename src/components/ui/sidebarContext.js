import { createContext, useContext } from 'react';

/* Shared sidebar state.
   - collapsed / toggle / setCollapsed → desktop rail collapse (240 ↔ 64 px)
   - mobileOpen / openMobile / closeMobile → mobile drawer overlay
   Provided by <AppShell />, consumed by <TopBar />, the sidebar itself, and
   anything else that wants to drive the rail.
   Kept in a separate module so Fast Refresh treats components and constants
   independently. */
export const SidebarContext = createContext({
    collapsed: false,
    toggle: () => {},
    setCollapsed: () => {},
    mobileOpen: false,
    openMobile: () => {},
    closeMobile: () => {},
});

export function useSidebar() {
    return useContext(SidebarContext);
}
