import { createContext, useContext } from 'react';

/* Shared sidebar collapse state. Provided by <AppShell />, consumed by
   <TopNav /> (and anything else that wants to flip the rail). Kept in a
   separate module so Fast Refresh treats components and constants
   independently. */
export const SidebarContext = createContext({
    collapsed: false,
    toggle: () => {},
    setCollapsed: () => {},
});

export function useSidebar() {
    return useContext(SidebarContext);
}
