# DocVault

## 1. Project Overview
DocVault is a Personal Document Management Dashboard. It provides a web-based interface for managing, organizing, and securely accessing your personal documents. 

**Tech Stack:**
- **Frontend:** HTML, CSS, JavaScript (Vanilla), SweetAlert2, FontAwesome
- **Backend:** Google Apps Script (GAS)
- **Database:** Google Sheets
- **Storage:** Google Drive
- **Hosting:** Netlify

## 2. Architecture Diagram

```text
+-------------------+       +-----------------------+       +-------------------+
|                   |       |                       |       |                   |
|   Frontend Web    | <---> |  Google Apps Script   | <---> |   Google Sheets   |
|   (Netlify)       |       |  (Web App / API)      |       |   (Database)      |
|                   |       |                       |       |                   |
+-------------------+       +-----------------------+       +-------------------+
                                        |
                                        v
                            +-------------------+
                            |                   |
                            |   Google Drive    |
                            |   (File Storage)  |
                            |                   |
                            +-------------------+
```

## 3. Features List
- Secure User Authentication (Login, Logout, Password Reset)
- Document Upload, View, and Delete capabilities
- Categorize documents for better organization
- Centralized Dashboard for quick overview
- Role-based Access (Admin/User)
- Secure session management

## 4. Google Sheets Setup
Follow these steps to set up the database:
a. Create a new Google Sheet.
b. Create the following sheets exactly as named: `Users`, `Documents`, `Categories`, `PasswordResets`, `Sessions`
c. Add these exact column headers to the first row of each sheet:
   - **Users:** `id`, `name`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at`
   - **Documents:** `id`, `user_id`, `title`, `description`, `category_id`, `file_id`, `file_name`, `file_type`, `file_size`, `created_at`, `updated_at`
   - **Categories:** `id`, `name`, `description`, `created_at`
   - **PasswordResets:** `id`, `user_id`, `token`, `expires_at`, `used`, `created_at`
   - **Sessions:** `id`, `user_id`, `token`, `expires_at`, `created_at`
d. Note the Spreadsheet ID from the URL (the long string between `/d/` and `/edit`).

## 5. Google Drive Setup
a. Create a new folder in your Google Drive where documents will be stored.
b. Note the Folder ID from the URL (the string after `/folders/`).

## 6. Google Apps Script Setup
a. Go to [script.google.com](https://script.google.com).
b. Create a new project.
c. Copy your backend scripts into the project: `Code.gs`, `Auth.gs`, `Documents.gs`, `Categories.gs`, `Drive.gs`, `Utils.gs`.
d. Go to Project Settings (gear icon) > Script Properties and add:
   - `SPREADSHEET_ID` = `your-sheet-id`
   - `DRIVE_FOLDER_ID` = `your-folder-id`
e. Run the `setup()` function (from your `Code.gs` or `Utils.gs`) to ensure all sheet headers are correctly initialized.
f. Deploy as a Web App:
   - Click "Deploy" > "New deployment"
   - Select type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click Deploy and note the **Web App URL**.
g. Run `seedDefaultCategories()` (if available in your script) to populate default categories.

## 7. Frontend Setup
a. Open `assets/js/config.js` in your local project.
b. Replace the placeholder URL with your Web App URL:
```javascript
const CONFIG = {
    API_URL: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
};
```

## 8. Netlify Deployment
a. Create a free account at [netlify.com](https://www.netlify.com).
b. You can either drag & drop your project folder directly into the Netlify dashboard.
c. OR, push your code to GitHub and connect the repository to Netlify for continuous deployment.
d. Note the deployed Netlify URL.

## 9. First Login / Initial User
To create the first admin user, you need to manually add a row to the `Users` sheet.
a. Add a row with the following details:
   - `id`: `usr-12345` (or any UUID)
   - `name`: `Your Name`
   - `email`: `your@email.com`
   - `password_hash`: *(see below)*
   - `role`: `admin`
   - `status`: `active`
   - `created_at`: `2023-10-27T10:00:00.000Z` (use current ISO date)
b. **How to get password hash:** Open the Apps Script editor, run the following code in a temporary function to get the hash for your desired password, and paste it into the sheet.
```javascript
function generateMyHash() {
  Logger.log(hashString('mypassword')); // Replace 'mypassword' and view Logs for the result
}
```

## 10. Security Notes
- Google Apps Script runs entirely under your Google account. Ensure your Drive folder and Spreadsheet remain private.
- The `access: "ANYONE_ANONYMOUS"` deployment setting only exposes the Web App URL, not your underlying files.
- Ensure CORS configurations in Netlify (via `netlify.toml`) restrict framing and loading of external scripts to authorized sources.

## 11. API Reference
| Action | Method | Required Params | Returns |
|--------|--------|-----------------|---------|
| `login` | POST | `email`, `password` | `{ token, user }` |
| `logout` | POST | `token` | `{ success: true }` |
| `getDocuments` | GET | `token` | `[{ document }]` |
| `addDocument` | POST | `token`, `title`, `fileBase64`, etc. | `{ success, document }` |
| `deleteDocument` | POST | `token`, `documentId` | `{ success: true }` |
| `getCategories` | GET | `token` | `[{ category }]` |

## 12. Troubleshooting
- **CORS Errors:** This is a known limitation of Google Apps Script. GAS doesn't return true CORS headers on redirects, but `fetch` requests with `redirect: 'follow'` or using JSONP typically resolve this.
- **Token Expired:** If your session token expires, simply log out and log back in.
- **Drive file not found:** Double-check your `DRIVE_FOLDER_ID` in Script Properties. Ensure the executing account has access to the folder.
- **Sheet not found:** Verify the `SPREADSHEET_ID` in Script Properties and ensure the sheet names match exactly.

## 13. Customization
- Modify HTML templates in the root directory to change the UI.
- Update `assets/css/` to adjust styling and branding.
- Add new endpoints in Apps Script by extending `doPost` and `doGet` handlers.

## 14. License
This project is licensed under the MIT License.
