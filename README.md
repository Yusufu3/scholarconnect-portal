# ScholarConnect Portal

Build a simple, clean IZF Scholarship Student Registration system with 2 dashboards: Student and Admin.

STUDENT:

- Use the 61 verified UNIMA scholarship students (S/N 352–412) from the provided source as the initial eligible-student list.

- Student first enters their name. Use a non-AI fuzzy name-matching algorithm (case-insensitive, spacing normalization, typo/transposition tolerance) to identify the closest eligible student. Example: “Yusuf Bmausi” should match “Yusufu Bamusi” when the similarity is sufficiently high.

- After successful identification, require/confirm the student’s Registration Number before allowing completion.

- Show: First Name, Middle Name (optional), Surname, Personal Account Number, Registration Number, Year of Study, and Programme Name.

- Programme Name should come from the eligible-student record and be displayed automatically.

- Put this note directly below Personal Account Number: “Personal Account Number must be taken from the University portal, NOT from the bank.”

- Validate required fields and prevent duplicate submissions.

- After successful submission, show a clear “Congratulations! Your scholarship information has been successfully submitted.” message.

ADMIN:

- Add a simple Admin Login button in a reasonable location.

- Admin password: Yusufubamusi#1-

- Protect the admin dashboard properly; do not expose the password in the normal UI.

- Admin dashboard must have the 61 eligible UNIMA students in a dedicated navigable section.

- Admin can search, add, edit, and delete eligible students.

- Admin can view submitted student information and submission status.

- Add an Export section where admin can select the fields/columns, choose a clean layout, preview the export, then download as PDF or Excel.

- Keep the UI simple, professional, mobile-friendly, and easy to use.

- Use the existing database/backend and implement proper validation and secure access controls.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93134bf7-297c-4241-b4f5-e1627b54c416).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
