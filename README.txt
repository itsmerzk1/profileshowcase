TEAM OKD PROFILE SHOWCASE - CLOUD SYNC VERSION

WHAT THIS FIX DOES
- Visitors will see your updated profile showcase after you configure Firebase Realtime Database.
- Site intro music plays after the visitor clicks ENTER.
- Profile music plays automatically when the visitor opens a member profile.
- If a profile has music, the site intro music stops.
- No public music UI is shown, so visitors cannot mute/pause from the page.
- Social links are icons/logos.

IMPORTANT
Browser autoplay rules require one user click before audio can start. The ENTER button counts as that click.

FOR MUSIC THAT EVERYONE CAN HEAR
Use direct audio links, for example:
- music/intro.mp3 if you include files in your deployed site
- Discord CDN direct audio attachment link
- Any direct .mp3/.wav/.ogg URL

Do NOT use YouTube for background music. YouTube often blocks embeds/audio and may show Error 153.

UPLOAD MUSIC BUTTON NOTE
Uploaded music is only saved in the current browser using IndexedDB. It is good for testing/local use, but visitors will NOT get that uploaded file. For visitors, use a direct music URL or include mp3 files in the project folder and use paths like music/intro.mp3.

HOW TO MAKE OWNER CHANGES PUBLIC TO EVERY VISITOR
1. Go to Firebase Console and create a free project.
2. Create a Realtime Database.
3. In Realtime Database rules, for simple testing, use:

{
  "rules": {
    ".read": true,
    ".write": true
  }
}

4. Create a Web App in Firebase Project Settings.
5. Copy your Firebase config.
6. Open firebase-config.js and paste your real config.
7. Deploy the folder to Vercel or GitHub Pages.
8. Login as owner, edit members/settings, and save.

Default owner passcode is in script.js:
const OWNER_PASSCODE = 'OKDOWNER123';
Change it before deploying.

SECURITY NOTE
This is a free static website setup. The owner passcode is basic protection only because static websites expose front-end code. For stronger security, use Firebase Authentication + secure database rules.
