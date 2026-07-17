export type Gender = "male" | "female";
export type Role = "admin" | "staff" | "finance" | "teacher" | "student" | "parent" | "pending";
export type AssignableRole = Exclude<Role, "pending">;
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
      academic_years: {
        Row: {
          id: string;
          seq: number;
          name: string;
          starts_on: string | null;
          ends_on: string | null;
          is_current: boolean;
          school_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["academic_years"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_years"]["Row"]>;
        Relationships: [];
      };
      schools: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schools"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Role;
          full_name: string;
          phone: string | null;
          school_id: string | null;
          teacher_id: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          school_id: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
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
          year_id: string;
          term: Term;
          exam_date: string;
          attendance_pct: number;
          test_score: number;
          subject_scores: Record<string, number>;
          total_score: number;
          grade: string;
          school_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exams"]["Row"]> & {
          student_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["exams"]["Row"]>;
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          school_id: string;
          code: string;
          role: AssignableRole;
          email: string | null;
          teacher_id: string | null;
          student_ids: string[];
          created_by: string | null;
          expires_at: string;
          used_by: string | null;
          used_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invites"]["Row"]> & {
          role: AssignableRole;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>;
        Relationships: [];
      };
      profile_students: {
        Row: {
          profile_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_students"]["Row"]>;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          class_id: string | null;
          year_id: string;
          school_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["enrollments"]["Row"]> & {
          student_id: string;
          year_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
        Relationships: [];
      };
      student_fees: {
        Row: {
          id: string;
          student_id: string;
          year_id: string;
          school_id: string;
          amount: number;
          discount: number;
          discount_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["student_fees"]["Row"]> & {
          student_id: string;
          year_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["student_fees"]["Row"]>;
        Relationships: [];
      };
      fee_payments: {
        Row: {
          id: string;
          student_id: string;
          year_id: string;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          paid_at: string;
          school_id: string;
          updated_at: string;
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
          school_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & {
          payee: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Relationships: [];
      };
      teacher_subjects: {
        Row: {
          teacher_id: string;
          subject_id: string;
          school_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teacher_subjects"]["Row"]> & {
          teacher_id: string;
          subject_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["teacher_subjects"]["Row"]>;
        Relationships: [];
      };
      exam_scores: {
        Row: {
          id: string;
          exam_id: string;
          subject_id: string;
          school_id: string;
          score: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exam_scores"]["Row"]> & {
          exam_id: string;
          subject_id: string;
          score: number;
        };
        Update: Partial<Database["public"]["Tables"]["exam_scores"]["Row"]>;
        Relationships: [];
      };
      expense_payments: {
        Row: {
          id: string;
          expense_id: string;
          school_id: string;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          paid_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expense_payments"]["Row"]> & {
          expense_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["expense_payments"]["Row"]>;
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
          party_phone: string | null;
          party_address: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          items: InvoiceItem[];
          total: number;
          issued_date: string;
          due_date: string | null;
          note: string | null;
          school_id: string;
          created_at: string;
          updated_at: string;
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
          party_phone: string | null;
          party_address: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          amount: number;
          method: PaymentMethod;
          note: string | null;
          received_at: string;
          school_id: string;
          updated_at: string;
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
    Views: {
      student_fee_balances: {
        Row: {
          student_id: string;
          full_name: string;
          photo_url: string | null;
          class_id: string | null;
          class_name: string | null;
          student_status: PersonStatus;
          due: number;
          paid: number;
          balance: number;
          fee_status: "paid" | "partial" | "unpaid";
          gross: number;
          discount: number;
          discount_reason: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_invite: {
        Args: {
          p_role: Exclude<AssignableRole, "admin">;
          p_email?: string | null;
          p_teacher_id?: string | null;
          p_student_ids?: string[];
        };
        Returns: { code: string };
      };
      invite_info: {
        Args: { p_code: string };
        Returns: { valid: boolean; reason?: string; school_name?: string; role?: Role };
      };
      platform_admin_invite: {
        Args: { p_school_id: string };
        Returns: string;
      };
      set_member_role: {
        Args: { p_user_id: string; p_role: AssignableRole };
        Returns: undefined;
      };
      link_member_teacher: {
        Args: { p_user_id: string; p_teacher_id: string | null };
        Returns: undefined;
      };
      link_member_students: {
        Args: { p_user_id: string; p_student_ids: string[] };
        Returns: undefined;
      };
      remove_member: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      create_school: {
        Args: { p_name: string };
        Returns: { school_id: string; name: string; invite_code: string };
      };
      join_school: {
        Args: { p_code: string };
        Returns: { school_id: string; name: string; role: Role };
      };
      platform_list_schools: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          created_at: string;
          members: number;
          students: number;
          has_admin: boolean;
        }[];
      };
      platform_delete_school: {
        Args: { p_school_id: string };
        Returns: undefined;
      };
      set_current_academic_year: {
        Args: { p_year_id: string };
        Returns: { name: string; enrolled: number };
      };
      record_fee_payment: {
        Args: {
          p_student_id: string;
          p_amount: number;
          p_method?: PaymentMethod;
          p_note?: string | null;
        };
        Returns: {
          payment_id: string;
          student_name: string;
          year_id: string;
          paid: number;
          balance: number;
        };
      };
      record_invoice_payment: {
        Args: {
          p_invoice_id: string;
          p_amount: number;
          p_method?: PaymentMethod;
          p_note?: string | null;
        };
        Returns: { party_name: string; paid: number; balance: number };
      };
      record_expense_payment: {
        Args: {
          p_expense_id: string;
          p_amount: number;
          p_method?: PaymentMethod | null;
          p_note?: string | null;
        };
        Returns: { payee: string; paid: number; remaining: number };
      };
      restore_school_snapshot: {
        Args: { p_data: unknown; p_school_id?: string | null };
        Returns: Record<string, number>;
      };
      save_exam: {
        Args: {
          p_student_id: string;
          p_term: Term;
          p_scores: Record<string, number>;
          p_exam_id?: string | null;
          p_class_id?: string | null;
          p_year_id?: string | null;
          p_exam_date?: string | null;
          p_attendance_pct?: number;
          p_test_score?: number;
        };
        Returns: { exam_id: string; student_name: string; total: number; grade: string };
      };
      set_teacher_subjects: {
        Args: { p_teacher_id: string; p_subject_ids: string[] };
        Returns: undefined;
      };
      set_student_fee: {
        Args: {
          p_student_id: string;
          p_amount: number;
          p_discount?: number;
          p_discount_reason?: string | null;
          p_year_id?: string | null;
        };
        Returns: { student_name: string; due: number; discount: number };
      };
    };
  };
}

export type School = Database["public"]["Tables"]["schools"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type AcademicYear = Database["public"]["Tables"]["academic_years"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
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
