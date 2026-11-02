This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Comics and manga

Apply the schema to a local database after pulling changes:

```bash
npx prisma db push
npm run dev
```

Open **Comics & Manga**, create a series with an uploaded cover, then add a chapter with image files. Reorder pages before saving a draft or publishing. Readers can choose right-to-left, left-to-right, or vertical mode and follow a series for chapter notifications.

## Accounts and security

Both embedded creator profiles and dedicated user pages offer clickable **Followers** and **Following** counts opening the same user-list modal. Only approved follows appear; pending protected-profile requests are excluded. Open profiles, follow/unfollow, and start messages from the list. The profile spotlight-quote banner has been removed.

Under **Settings > Your account**, edit your **About me** introduction (up to 2000 characters), display name, custom avatar/banner URLs and main website. Avatar/banner preset pickers have been removed; existing images are preserved. **Creator & Links** lets you add, rename and remove up to 10 labeled HTTP(S) website links (4000 characters combined). Existing social links are loaded into the editable list. Press **Save Changes** to persist updates; introductions and links appear on your public profile, including **About & Links**.

Accounts use password-based sign-in and server-side sessions. To change an existing account password locally:

```bash
node scripts/set-password.mjs byron
```

The script reads the password without echoing it and revokes existing sessions for that user. Provision an administrator with `npx tsx scripts/create-admin.ts <username> [email]`; it prompts for a password without echoing it and revokes existing sessions when updating an account. New accounts cannot grant themselves admin access. Account switching requires password sign-in in every environment.

If an older provisioning script was used on another database, rotate every account using its exposed password and revoke sessions before deployment. Fixing source code does not rotate credentials on other deployments.

Protected profiles require owner-approved followers. Apply the schema with `npx prisma db push`, then run `npx tsx scripts/migrate-follow-approvals.ts` to preserve existing public-account follows. Existing protected-account follows remain pending; owners approve or reject them under **Settings > Privacy and safety > Follow requests**. Enabling protection resets existing follows to pending approval. Feeds, profiles, collections, notifications, comic readers and direct hosted media requests enforce the same access policy. Externally hosted media must be uploaded locally before enabling protection.

New message attachments and comic chapter uploads are stored in `private-media/` outside the public directory. Draft chapter pages are accessible to the creator; published chapter pages respect profile protection. Messages are accessible to their participants. Older files may remain in `sfw/`; review and migrate them before deployment. The app routes `/sfw/` through authenticated media checks and uses `private, no-store` caching. **Never configure a proxy, CDN or static host to serve `sfw/` or `private-media/` directly or cache personalized API/media responses.** Purge existing public media caches when enabling these controls. Previously downloaded copies cannot be recalled.

Production requires HTTPS, persistent storage for the database and both media directories, regular backups, and an appropriate reverse-proxy request-size limit. The application is not a substitute for a security audit or production abuse controls. Cookies are marked Secure in production, so use HTTPS there. For local development use `npm run dev` on localhost.

## Booru tags and ratings

**Site Appearance & Themes** applies the selected background, panel, text, and accent palette across the feed and routed pages. All six themes save in this browser and restore after reload; Sakura uses light controls and readable dark text, while media overlays retain contrast. Theme options support keyboard selection and Escape closes the picker. If browser storage is blocked, the theme still applies and an explicit warning explains that it could not be saved. The messenger light/dark toggle uses the same saved preference.

In Admin → Reports, expand **View reported post** to review media (including gallery files and video), description, rating, tags, artist credit, and source without leaving the moderation queue. Resolve, Dismiss, and Delete Post & Resolve remain available alongside the preview. Source links open a separate tab. Missing or restricted media displays an explicit warning; existing protected-content access rules are unchanged.

The uploader uses tags and content ratings rather than a category/niche picker. Add **Artist name / credit** when sharing another artist's work and **Original source URL** to link the original artwork or artist's page. These fields persist on the post and appear in the artwork viewer and dedicated post page; a source can be provided without an artist credit. Source links must use HTTP(S). Credit is uploader-provided, not independently verified, and does not replace permission to share. Legacy post categories remain stored for compatibility.

In the tag directory, **Include** and **Exclude** stage tags as chips in the header search bar without leaving the directory or searching. Press **Go** to apply the staged criteria and open the feed. A tag cannot be included and excluded simultaneously; chip removal and clearing the search also remain staged until **Go**.

Both home and routed-page header searches accept multiple explicit tags and keywords: `#cosplay #solo -#spoiler sunset`. Explicit tags become included/excluded chips; remaining keywords retain the feed's existing text-search behavior. Selected header chips scroll in a bounded area so the input and **Go** stay usable on phones. Messenger conversation-list search matches creator names and loaded message text; its in-chat search filters the selected conversation. Admin user/tag searches accept `@username` and `#tag` prefixes.

The shared vocabulary in `src/lib/tag-taxonomy.ts` contains starter tags for franchises, characters, genres, clothing, poses, activities, appearance, anatomy, settings, content and media. Ratings are selected separately as SFW, ecchi (stored as `questionable`), or explicit. Run `npm run tags:sync` to add the starter tags and migrate old category names without deleting tags or post links.

`npx tsx prisma/seed.ts` now initializes only missing site settings and real tags without resetting existing data or creating sample accounts, posts, comics, or activity. Demo/test accounts and their content have been removed from the local database; the admin account and settings are preserved. Media files are not deleted from disk. Register accounts and upload your own artwork/comics to populate the site. New accounts use a neutral default avatar; sample profile pickers, demo account lists, and sample message attachments are removed.

## Saved searches

Signed-in users can save feed searches by query, included/excluded tags, media type and rating. Each account can save up to 20 searches. Enable new-match alerts when saving a search or toggle alerts later; matching new posts appear in the in-app notifications feed. Apply schema changes locally with `npx prisma db push`.

## Explore discovery

**Explore** includes Discover, Artwork, Creators and Tags tabs, with week/month/all-time and rating filters. Artwork ranks by favorites in the selected period (150 points each) plus views on posts uploaded in that period; all-time includes all views. Up to 500 eligible artworks, ordered by total favorites then newest upload, are considered. Creator rankings aggregate their eligible artwork scores; tags rank by eligible artwork count, then score. This is activity-based discovery, not personalized recommendations or a measurement of view growth.

Click artwork to open it, a creator to visit their profile, **Follow** to follow/request access, or a trending tag to open a matching feed. Header **Go** also opens feed search results. Featured albums remain below discovery. Protected creator content requires owner/approved-follower access; banned creators are excluded from trends and the global SFW-only setting overrides discovery ratings. Empty periods offer a wider time range; load errors provide a retry action.

Run `PLAYWRIGHT_BASE_URL=http://localhost:3000 E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/explore.spec.ts` for ranking/access checks and mobile/tablet/desktop interaction regressions.

## Admin announcements

Sign in as an administrator and open **Admin Dashboard > Announcements** to publish, edit or remove the home-feed announcement. Add a title, multiline message and optional site-relative or HTTP(S) action link. Notices persist for visitors on their next page load; removal restores the default community notice. Admins can also use **Edit Announcement** on the home feed. Only server-authenticated administrators can update announcements.

The announcement's **X** hides it immediately for visitors and administrators. Dismissal is remembered in that browser across reloads and tabs; publishing an updated announcement makes it visible again. The default community notice can also be dismissed. This preference is browser-local, not synced across devices, and clearing site storage resets it. Administrators can still edit dismissed announcements from the Admin Dashboard.

## Responsive regression tests

The bottom mobile navigation is shown below 768px only. Tablet widths retain the header navigation drawer; desktop widths use the sidebar.

Run the layout matrix separately with:

```bash
PORT=3105 PLAYWRIGHT_BASE_URL=http://localhost:3105 E2E_BASE_URL=http://localhost:3105 npx playwright test e2e/responsive.spec.ts
```

The Chromium tests cover 320–2560px widths, breakpoint boundaries and short landscape screens across feed/navigation, discovery, collections, uploads, settings, profiles, posts, comics/studio/reader, messaging and admin sections. They check document overflow and off-screen content, exercise navigation and scroll a dialog's submit action into view. Intentional scroll containers (such as moderation tables) are allowed. Test-owned accounts and content are deleted afterward; images are replaced with a neutral fixture. These are layout regressions, not certification of every device/browser or feature. Do not run `next build` while the test development server is running.

Search stress regressions can reuse a running development server:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/search-mobile.spec.ts e2e/tag-directory.spec.ts e2e/responsive.spec.ts --grep 'search|directory|320x568|375x667|430x932|667x375|768x1024|1440x900'
```

These exercise 24 included/excluded search tags, 25 upload tags including a long name, keyword/tag submission from the home/profile/post/settings/comic headers, directory and comic filters, post-tag modal filters, both messenger searches and all three admin searches. Matching and no-match cases are checked where applicable. Native mobile keyboards, Safari/iOS zoom behavior and screen-reader interaction still require device/browser testing.

## Local database setup

The local SQLite database is no longer included in the repository. After setting `DATABASE_URL` in `.env`, run `npx prisma db push` to create it, then `npx tsx prisma/seed.ts` to initialize settings and tags. Back up any existing database before making schema changes. Existing deployments should keep their own database and media storage; removing the tracked copy does not migrate or erase them.

A database was previously committed to public Git history. Removing the current copy does not remove historical copies. Treat any accounts, password hashes, session tokens and private messages in that database as exposed: revoke existing sessions and rotate affected passwords on any deployment that used those records. Review Git history cleanup and other copies separately.
