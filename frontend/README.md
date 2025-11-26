# Tolti-Tracker Frontend

This is the frontend for the Tolti-Tracker Solana dApp, built with [Next.js](https://nextjs.org).

## Getting Started

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Run Development Server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

### Solana Network

The application is currently configured for **Devnet**.
To change this, edit `app/components/WalletContextProvider.tsx`.

### Program ID

The Solana Program ID is defined in `app/page.tsx`.
If you redeploy the Anchor program, make sure to update the `PROGRAM_ID` constant in that file with your new program ID.

## Deploy on Vercel

1.  Push your code to a GitHub repository.
2.  Go to [Vercel](https://vercel.com) and import your project.
3.  **Important:** In the "Root Directory" setting, select `frontend`.
4.  The "Build Command" should be `next build` (default).
5.  The "Output Directory" should be `.next` (default).
6.  Click **Deploy**.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
