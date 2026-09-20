import { createContext, useContext } from 'react';

// Whether the menu is open. It lives in a context so the page wrapper (Layout) can make room
// for the desktop drawer while the menu itself is rendered elsewhere.
export interface MenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const MenuContext = createContext<MenuState>({ open: false, setOpen: () => {} });
export const useMenu = () => useContext(MenuContext);
