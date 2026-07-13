# Email Setup Instructions

## Gmail App Password Setup

To enable email functionality for password reset, you need to generate a Gmail App Password:

### Step 1: Enable 2-Factor Authentication (if not already enabled)
1. Go to https://myaccount.google.com/security
2. Under "Signing in to Google", enable "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. In the "Select app" dropdown, choose "Mail"
4. In the "Select device" dropdown, choose "Other (Custom name)"
5. Enter "FYP Management System" or any name
6. Click "Generate"
7. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

### Step 3: Update .env.local File
1. Open `.env.local` in the root directory of the project
2. Replace `your-app-password-here` with the 16-character password
3. Remove any spaces from the password
4. Save the file

Example:
```
EMAIL_USER=hasnainzaidi962@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop   # This is what Google shows
```

Should become:
```
EMAIL_USER=hasnainzaidi962@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop       # Remove spaces
```

All system emails (registration OTP, forgot password, welcome) are sent from **hasnainzaidi962@gmail.com**.
`EMAIL_PASSWORD` must be a Gmail App Password for that same account.

### Step 4: Restart the Server
After updating .env.local:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Testing Password Reset

1. Go to the login page
2. Click "Forgot Password?"
3. Enter a valid email address from the database
4. Check the inbox of that email
5. Click the reset link in the email

## Troubleshooting

### Emails Not Sending?
- ✅ Verify App Password is correct (no spaces)
- ✅ Check that 2FA is enabled on Gmail account
- ✅ Confirm EMAIL_USER matches the Gmail account
- ✅ Server must be restarted after .env.local changes
- ✅ Check server console for error messages

### "Less Secure App Access" Error?
- Use App Password instead (see steps above)
- This error means you're using your regular password

### Email Goes to Spam?
- This is normal for development
- Check spam/junk folder
- Mark as "Not Spam" to improve delivery

## Changing Admin Email in Future

To change the admin email:

1. **Update System Settings:**
   - Login as Super Admin
   - Go to Settings
   - Update "Contact Email" in General Settings
   - Click Save

2. **Update .env.local:**
   - Change EMAIL_USER to new email
   - Generate new App Password for that email
   - Update EMAIL_PASSWORD
   - Restart server

3. **Files Affected:**
   - `data/system-settings.json` - Admin contact email
   - `.env.local` - Email credentials
   - Email will automatically use new admin email from settings

## Security Notes

- ⚠️ Never commit `.env.local` to version control
- ⚠️ Keep App Password secure
- ⚠️ Don't share App Password with anyone
- ⚠️ Each device/app should have its own App Password
- ⚠️ You can revoke App Passwords anytime from Google Account settings
