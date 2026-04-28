# Test Cases: Login → Categories Access

These are manual test cases to verify that after a successful login, the user can access the Categories screen and is not redirected out with “Login Required”.

## Test Account
- Email: `testbbb@gmail.com`
- Password: `12345678`

## Preconditions
- App built from the latest JS bundle (restart Metro + rebuild if needed)
- Device has internet access

Optional (recommended): start from a clean app state
- iOS Simulator: uninstall the app OR `Device` → `Erase All Content and Settings…`
- Android Emulator: uninstall the app OR clear app storage

---

## TC-01: Fresh install → Login → Open Categories
**Steps**
1. Launch the app
2. Go to Login
3. Login with the test account
4. After landing on Home, open Categories (via menu/tab)

**Expected**
- No “Login Required” popup
- Categories list renders (header shows “Categories”)
- You stay on Categories (no redirect to Home/Login)

---

## TC-02: Login → Immediately open Categories (timing)
This catches the common “serverless read-after-write” timing issue.

**Steps**
1. Login with the test account
2. As soon as Home appears, immediately open Categories

**Expected**
- Categories loads
- If backend is briefly inconsistent, you may see a short loader, but you should not be logged out

---

## TC-03: App relaunch with existing session
**Steps**
1. Login successfully
2. Fully close the app (swipe it away)
3. Reopen the app
4. Open Categories

**Expected**
- Still able to open Categories without logging in again

---

## TC-04: Token cleared only on confirmed auth failure
**Steps**
1. Login successfully
2. Turn on Airplane Mode (no internet)
3. Open Categories

**Expected**
- You should NOT get logged out due to a network error
- You may see an error like “Unable to Load Categories” and be redirected back to Home
- After turning internet back on, you should still be logged in and able to open Categories

---

## TC-05: Logout → Categories should require login
**Steps**
1. Login successfully
2. Logout (Menu → Logout)
3. Try to open Categories

**Expected**
- You see “Login Required”
- App redirects you out of Categories

---

## Quick Debug (if TC-01 fails)
Run this from the React Native debugger console (or add temporarily to HomeScreen after login):

- Print stored keys:
  - `AsyncStorage.getAllKeys().then(console.log)`
- Print stored token:
  - `AsyncStorage.getItem('sessionToken').then(console.log)`
  - `AsyncStorage.getItem('sessionToken:https://cognizen-x-backend.vercel.app').then(console.log)`

If both are null right after login, something is clearing storage (likely a 401 handler). If only one exists, that indicates a key mismatch.
