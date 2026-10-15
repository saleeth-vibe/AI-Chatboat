# Campus AI Assistant

This document lists the academic tables used by the admin setup: calendar, organisation, people, enrolment, and class teaching assignments.

Every foreign key is a `BIGINT` that references the parent table's `id`. Updates cascade. Deletes are restricted, so a parent row cannot be removed while child rows still point at it.

## How the tables connect

- An academic year contains odd and even terms.
- A branch owns classes. A class is one year level and section, such as year 2 section A.
- A department owns courses. A course may also exist with no department.
- A curriculum is either a shared first-year P or C cycle, or a branch curriculum for one semester. Curriculum courses attach courses to that curriculum.
- A faculty member and a student each have one login in `users`.
- A student enrolment places a student in a class for a span of academic years.
- A class curriculum assignment gives one class one curriculum for one term. Each course in that assignment is a class course offering, and an offering can name the faculty member who teaches it.
- A faculty course assignment records that a faculty member is eligible to teach a course during a term.
- A first-year cycle allocation records whether a first-year class starts the year on the P cycle or the C cycle.

## users

Login account for an admin, a faculty member, or a student.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| email | VARCHAR(255) | yes | Unique |
| password_hash | VARCHAR(255) | yes | Stored password hash |
| role | ENUM('ADMIN', 'STUDENT', 'FACULTY') | yes | |
| is_active | BOOLEAN | yes | Defaults to true |
| must_change_password | BOOLEAN | yes | Defaults to false. Set when an account is created with a temporary password |
| initial_password | VARCHAR(72) | no | Temporary password shown to an admin until the person changes it |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: one user can have one `faculty` row or one `students` row. `first_year_cycle_allocations.allocated_by_user_id` can point here.

## academic_years

A named academic year and the dates it covers.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| name | VARCHAR(20) | yes | Unique, for example `2026-27` |
| start_date | DATE | yes | |
| end_date | DATE | yes | Must be after `start_date` |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: a year has many `academic_terms`. Enrolments use a year as a start year and, when the enrolment has ended, as an end year. A first-year cycle allocation belongs to the cohort year.

## academic_terms

One odd or even term inside an academic year. A year has at most one term of each type.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| academic_year_id | BIGINT | yes | Foreign key to `academic_years` |
| period_type | ENUM('ODD', 'EVEN') | yes | |
| start_date | DATE | yes | Must fall inside the parent year |
| end_date | DATE | yes | Must fall inside the parent year |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Unique: `(academic_year_id, period_type)`.

Relations: belongs to one academic year. Referenced by faculty course assignments, class curriculum assignments, and the teaching records built from those assignments.

Odd terms map to semesters 1, 3, 5, and so on. Even terms map to semesters 2, 4, 6, and so on.

## departments

An academic department that can own courses and employ faculty.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| name | VARCHAR(150) | yes | |
| code | VARCHAR(20) | yes | Unique |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: a department has many `courses`. A faculty member whose affiliation is `DEPARTMENT` points here.

## branches

A degree programme, including how many years it runs and how its classes are sized.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| name | VARCHAR(150) | yes | |
| code | VARCHAR(20) | yes | Unique |
| duration_years | TINYINT | yes | Number of year levels |
| sections_per_year | TINYINT | yes | How many sections each year level has |
| class_capacity | INTEGER | yes | Seat limit used when classes are generated |
| supports_first_year_cycles | BOOLEAN | yes | Whether first-year classes use the P and C cycle split |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: a branch has many `classes`, many branch-scoped `curricula`, many `students`, and faculty members whose affiliation is `BRANCH`.

## classes

One section of one year level in a branch. Section codes are generated as A, B, C, and so on.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| branch_id | BIGINT | yes | Foreign key to `branches` |
| year_level | TINYINT | yes | 1 for first year, 2 for second year, and so on |
| section_code | VARCHAR(10) | yes | |
| capacity | INTEGER | yes | |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Unique: `(branch_id, year_level, section_code)`.

Relations: belongs to one branch. Students enrol into a class. A class receives a curriculum each term and, for first year, a P or C cycle allocation.

## courses

A subject that can be placed on a curriculum and taught to a class.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| code | VARCHAR(30) | yes | Unique |
| name | VARCHAR(150) | yes | |
| department_id | BIGINT | no | Foreign key to `departments` |
| description | TEXT | no | |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: belongs to one department when `department_id` is set. Linked to curricula through `curriculum_courses`, to faculty through `faculty_course_assignments`, and to a class term through `class_course_offerings`.

## curricula

The set of courses for either a shared first-year cycle or one semester of a branch.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| name | VARCHAR(150) | yes | |
| scope_type | ENUM('GLOBAL_CYCLE', 'BRANCH') | yes | |
| branch_id | BIGINT | no | Foreign key to `branches`. Set for `BRANCH`, empty for `GLOBAL_CYCLE` |
| semester_level | TINYINT | no | Set for a branch curriculum. Semester 1 is year 1 odd, semester 2 is year 1 even |
| cycle_type | ENUM('P', 'C') | no | Set for a global cycle curriculum |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: a `GLOBAL_CYCLE` curriculum is shared and is not tied to a branch. A `BRANCH` curriculum belongs to one branch. Courses are attached through `curriculum_courses`. A class receives one curriculum per term through `class_curriculum_assignments`.

There is one active global curriculum for cycle P and one for cycle C. A branch has one curriculum per semester level.

## curriculum_courses

Joins a curriculum to the courses it contains. A course can appear on many curricula, and a curriculum contains many courses. The same course is stored only once on a given curriculum.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| curriculum_id | BIGINT | yes | Foreign key to `curricula` |
| course_id | BIGINT | yes | Foreign key to `courses` |
| created_at | DATETIME | yes | |

Unique: `(curriculum_id, course_id)`.

## faculty

Profile for a faculty member. The login lives in `users`; this row holds the campus identity.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| user_id | BIGINT | yes | Foreign key to `users`. Unique, so one login has one faculty profile |
| employee_number | VARCHAR(50) | yes | Unique |
| name | VARCHAR(150) | yes | |
| affiliation_type | ENUM('BRANCH', 'DEPARTMENT') | yes | |
| branch_id | BIGINT | no | Foreign key to `branches`. Set when affiliation is `BRANCH` |
| department_id | BIGINT | no | Foreign key to `departments`. Set when affiliation is `DEPARTMENT` |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: belongs to one user. Belongs to either one branch or one department. Can have many `faculty_course_assignments` and can be named on many `class_course_offerings`.

## students

Profile for a student. The login lives in `users`; this row holds the campus identity and home branch.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| user_id | BIGINT | yes | Foreign key to `users`. Unique, so one login has one student profile |
| university_id | VARCHAR(50) | yes | Unique |
| name | VARCHAR(150) | yes | |
| branch_id | BIGINT | yes | Foreign key to `branches` |
| entry_year_level | TINYINT | yes | Year level at which the student entered |
| is_active | BOOLEAN | yes | Defaults to true |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Relations: belongs to one user and one branch. Has many `student_class_enrolments`.

## student_class_enrolments

Places a student in a class from a starting academic year until the enrolment is closed.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| student_id | BIGINT | yes | Foreign key to `students` |
| class_id | BIGINT | yes | Foreign key to `classes` |
| start_academic_year_id | BIGINT | yes | Foreign key to `academic_years` |
| end_academic_year_id | BIGINT | no | Foreign key to `academic_years`. Empty while the enrolment is still open |
| status | ENUM('ACTIVE', 'COMPLETED', 'TRANSFERRED') | yes | A student has one `ACTIVE` enrolment |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Indexes: `(class_id, status)` and `(student_id, status)`.

Relations: belongs to one student, one class, one start year, and optionally one end year.

## faculty_course_assignments

Records that a faculty member may teach a course during a specific term. One faculty member, course, and term combination is stored only once.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| faculty_id | BIGINT | yes | Foreign key to `faculty` |
| course_id | BIGINT | yes | Foreign key to `courses` |
| academic_term_id | BIGINT | yes | Foreign key to `academic_terms` |
| status | ENUM('ACTIVE', 'CANCELLED') | yes | |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Unique: `(faculty_id, course_id, academic_term_id)`.

Index: `(course_id, academic_term_id, status)`.

Relations: belongs to one faculty member, one course, and one academic term.

## first_year_cycle_allocations

Chooses the semester-1 cycle for one first-year class in one cohort year. Semester 2 uses the other cycle. A class is allocated once for a cohort year.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| cohort_academic_year_id | BIGINT | yes | Foreign key to `academic_years` |
| class_id | BIGINT | yes | Foreign key to `classes` |
| semester_1_cycle_type | ENUM('P', 'C') | yes | |
| allocated_at | DATETIME | yes | |
| allocated_by_user_id | BIGINT | no | Foreign key to `users` |

Unique: `(cohort_academic_year_id, class_id)`.

Relations: belongs to one academic year and one class. Optionally records the user who made the allocation.

## class_curriculum_assignments

Gives one class exactly one curriculum for one academic term, and tracks whether that teaching period is planned, ongoing, or completed.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| class_id | BIGINT | yes | Foreign key to `classes` |
| academic_term_id | BIGINT | yes | Foreign key to `academic_terms` |
| curriculum_id | BIGINT | yes | Foreign key to `curricula` |
| status | ENUM('PLANNED', 'ONGOING', 'COMPLETED') | yes | Status only moves forward |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Unique: `(class_id, academic_term_id)`.

Relations: belongs to one class, one term, and one curriculum. Has many `class_course_offerings`.

## class_course_offerings

One course being taught as part of a class curriculum assignment. Each course appears once on that assignment. The offering can name the faculty member assigned to teach it.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | BIGINT | yes | Primary key |
| class_curriculum_assignment_id | BIGINT | yes | Foreign key to `class_curriculum_assignments` |
| course_id | BIGINT | yes | Foreign key to `courses` |
| assigned_faculty_id | BIGINT | no | Foreign key to `faculty` |
| status | ENUM('PLANNED', 'ONGOING', 'COMPLETED') | yes | Status only moves forward |
| created_at | DATETIME | yes | |
| updated_at | DATETIME | yes | |

Unique: `(class_curriculum_assignment_id, course_id)`.

Index: `assigned_faculty_id`.

Relations: belongs to one class curriculum assignment and one course. Optionally belongs to the faculty member assigned to that offering.
