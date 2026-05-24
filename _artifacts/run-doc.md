# Run Document

This document provides instructions for operators on how to set up, configure, run, and test the LabDash Patient Report Portal application.

## Prerequisites
-   Node.js 22.x LTS
-   npm 10.x or later
-   Access to a MongoDB instance (v6.0 or later)

## Install

The project is a monorepo using npm workspaces.

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies**: From the repository root, run:
    ```bash
    npm install
    ```
    This command will install dependencies for both the `backend` and `frontend` applications.

## Configure

The application requires environment variables for configuration. Create `.env` files in the `backend` and `frontend` directories by copying the provided `.env.example` files.

1.  **Backend Configuration**:
    Create a `backend/.env` file with the following variables:
    ```ini
    # Full connection string for the MongoDB database.
    MONGODB_URI=mongodb://localhost:27017/labdash

    # A long, random string for signing JSON Web Tokens.
    JWT_SECRET=your-super-secret-and-long-string-for-jwt

    # Port for the backend API to listen on.
    PORT=3001
    ```

2.  **Frontend Configuration**:
    Create a `frontend/.env` file with the following variable:
    ```ini
    # The public URL of the backend API.
    NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
    ```

## Run

You can run both the backend and frontend applications concurrently for development.

1.  **Start Backend Server**:
    ```bash
    npm run start:dev -w backend
    ```
    The backend API will be available at `http://localhost:3001` by default.

2.  **Start Frontend Server**:
    In a separate terminal, run:
    ```bash
    npm run dev -w frontend
    ```
    The frontend application will be available at `http://localhost:3000`.

## Test

To run the test suites for both applications, execute the following command from the repository root:

```bash
npm test
```

This will run the tests for the `backend` and `frontend` workspaces sequentially.
