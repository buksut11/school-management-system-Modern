// Page sizes for server-paginated lists. Kept in their own module (no
// server-only imports) so both the server data layer and client views
// can read them without pulling next/headers into the client bundle.
export const STUDENTS_PAGE_SIZE = 24;
export const TEACHERS_PAGE_SIZE = 24;
export const INVOICES_PAGE_SIZE = 25;
export const RECEIPTS_PAGE_SIZE = 25;
