# Iron Mile

Personal strength and running log. Everything stays in this browser under the key `iron-mile.v1`. There is no account and no server.

## Run locally

```bash
npm install
npm run dev
```

Open the address Vite prints, usually `http://127.0.0.1:5173/`.

## Production build

```bash
npm run build
npm run preview
```

`npm run build` typechecks and writes the static site to `dist`. Asset paths are relative, so the same folder works on GitHub Pages.

## GitHub Pages

1. Push the project to a GitHub repository.
2. Run `npm run build`.
3. Publish the contents of `dist`.
   - Repository site: in the repo, open Settings, then Pages, and deploy the `dist` folder from a `gh-pages` branch, or use a GitHub Action that uploads `dist`.
   - The app uses hash routes (`#/workouts`), so it does not need a server rewrite.
4. Open `https://<user>.github.io/<repository>/`.

Do not put a backup file in the repository if you want the log to stay private. The log is not in the source tree.

## Backup

On Settings, choose **Export JSON**. That file contains workouts, runs, templates, the program start, schedule moves, exercise wording, theme, and units.

**Export strength CSV** is one row per set. **Export running CSV** is one row per treadmill segment. Walking stays in its own segment type, and the running miles column counts only running segments.

## Restore

On Settings, choose **Import JSON** and pick a backup. The page asks you to confirm before it replaces the log on this device. Theme and units in the file are restored too.

**Clear training log** removes workouts, runs, templates, schedule moves, and saved exercise wording after a second confirmation. Theme and units stay.
