# Kick Off Alias

Build a mobile-first soccer party game app similar to "Alias".

Core Gameplay Loop:

Game Setup: Allow players to select a time limit (e.g., 60 seconds) and pick player card packs (e.g., Top 5 Leagues, 2000s Legends, MLS).

Main Game Screen: Display a soccer player card showing the player's position, club name, and nation flag/text, but keep the player's name clearly visible at the top for the explainer.

Action Controls: Include a 60-second countdown timer and two quick action buttons: "Correct" (green button / +1 point) and "Skip" (red button / 0 points).

Automatic Card Cycle: Once a button is tapped, immediately cycle to the next player card in the active pack.

Results Screen: When the timer hits 0, display the total score, a recap of guessed vs. skipped players, and a "Play Again" button.

Design & Style:

Modern, dark-mode FIFA/FC-style card layout.

High-contrast, easy-to-read text designed for fast gameplay on mobile screens.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/13b4e3c6-b5b9-4228-be4b-1ee33be8f66b).

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
