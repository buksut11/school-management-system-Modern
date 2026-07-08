# Academic table

_Started 2026-07-01 10:43 UTC_

---

## User

add academic table

## Assistant

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: questions_v2]_

## User

Questions answered:
- what_table: A student's academic history/report card (all past exams, term by term)
- where: New page/section in the sidebar
- data_scope: Whole school (all classes)

## Assistant

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

Now inserting the JS logic for academic records, right after the exportRows block:

_[tool: str_replace_edit]_

Now add the return-object entries (isAcademic, goAcademic, nav/badge, title) and search handler:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now add all the academic-record values themselves to the returned object. Let me find a good spot near the exam-related returns:

_[tool: grep]_

_[tool: str_replace_edit]_

Now add the sidebar nav button and the screen markup. First the nav button, right after the Exams & Grades button:

_[tool: str_replace_edit]_

Now insert the screen content, right before the "CLASSES" section:

_[tool: str_replace_edit]_

Now verify it loads and check the new screen renders correctly.

_[tool: ready_for_verification]_

Added an "Academic Records" screen to the sidebar — a whole-school report-card table (Student ID, Term 1–3 scores, overall average, grade, trend) with class-filter tabs, search, and CSV export, matching the app's existing list styling.

