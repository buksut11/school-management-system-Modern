export type Gender = "male" | "female";
export type PersonStatus = "active" | "inactive";
export type AttendanceStatus = "present" | "late" | "absent";
export type SubjectType = "core" | "elective";
export type Term = "Term 1" | "Term 2" | "Term 3";
export type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "other";
export type ExpenseCategory =
  | "salaries"
  | "rent"
  | "utilities"
  | "supplies"
  | "maintenance"
  | "transport"
  | "other";
export type PartyType = "student" | "teacher" | "staff";
export interface InvoiceItem {
  description: string;
  qty: number;
  unit_price: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin" | "staff";
          full_name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          seq: number;
          name: string;
          room: string | null;
          base_fees: number;
          capacity: number;
          teacher_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["classes"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Row"]>;
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          seq: number;
          full_name: string;
          dob: string | null;
          gender: Gender | null;
          address: string | null;
          mobile: string | null;
          subjects: string[];
          photo_url: string | null;
          status: PersonStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teachers"]["Row"]> & {
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["teachers"]["Row"]>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          seq: number;
          full_name: string;
          dob: string | null;
          gender: Gender | null;
          address: string | null;
          mobile: string | null;
          parent_mobile: string | null;
          class_id: string | null;
          base_fees: number;
          photo_url: string | null;
          status: PersonStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["students"]["Row"]> & {
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Row"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          class_id: string | null;
          date: string;
          status: AttendanceStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: number;
          kind: string;
          message: string;
          actor_id: string | null;
          actor_name: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_log"]["Row"]> & {
          kind: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Row"]>;
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          seq: number;
          name: string;
          head_teacher_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["departments"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Row"]>;
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          seq: number;
          name: string;
          department_id: string | null;
          teacher_id: string | null;
          type: SubjectType;
          periods_per_week: number;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subjects"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Row"]>;
        Relationships: [];
      };
      exams: {
        Row: {
          id: string;
          student_id: string;
          class_id: string | null;
          term: Term;
          exam_date: string;
          attendance_pct: number;
          test_score: number;
          subject_scores: Record<string, number>;
          total_score: number;
          grade: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exams"]["Row"]> & {
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["exams"]["Row"]>;
        Relationships: [];
      };
      fee_payments: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          paid_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["fee_payments"]["Row"]> & {
          student_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["fee_payments"]["Row"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          seq: number;
          payee: string;
          category: ExpenseCategory;
          description: string | null;
          amount: number;
          paid: number;
          date: string;
          method: PaymentMethod;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & {
          payee: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          seq: number;
          party_type: PartyType;
          party_id: string | null;
          party_name: string;
          party_detail: string | null;
          items: InvoiceItem[];
          total: number;
          issued_date: string;
          due_date: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          party_type: PartyType;
          party_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          seq: number;
          invoice_id: string | null;
          party_type: PartyType;
          party_id: string | null;
          party_name: string;
          party_detail: string | null;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          received_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["receipts"]["Row"]> & {
          party_type: PartyType;
          party_name: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["receipts"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
export type Teacher = Database["public"]["Tables"]["teachers"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type ActivityLogEntry = Database["public"]["Tables"]["activity_log"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Exam = Database["public"]["Tables"]["exams"]["Row"];
export type FeePayment = Database["public"]["Tables"]["fee_payments"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
