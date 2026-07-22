"use client";

import { createContext, useContext } from "react";

// The signed-in user's school name, provided once by the app shell so
// any client component (PDF buttons, exports) can brand its output
// without threading the name through every page/view prop chain.
const SchoolNameContext = createContext<string>("School");

export function SchoolNameProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return <SchoolNameContext.Provider value={name}>{children}</SchoolNameContext.Provider>;
}

export function useSchoolName() {
  return useContext(SchoolNameContext);
}
