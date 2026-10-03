<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the J.A.R.V.I.S. terminal as a browser-first single-route dashboard; its simulated telemetry and controls do not require persistence.
- AI replies stream from OpenAI via the /api/chat server route and voice via /api/tts (ElevenLabs); API keys stay server-side and are never stored in the browser.
