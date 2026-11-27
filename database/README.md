# Database Setup and Seeding Guide

This project uses **MongoDB** as its primary database via **Mongoose** (`backend/models/`).

## 1. Local MongoDB Setup (Windows)

1. Download **MongoDB Community Server** from the official MongoDB website (`https://www.mongodb.com/try/download/community`).
2. Run the `.msi` installer and keep **"Install MongoDB as a Service"** checked.
3. Verify MongoDB is running in PowerShell:
   ```powershell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
   ```
4. In your `.env` file at the project root, set:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/dbuu_placement_portal
   ```

## 2. MongoDB Atlas Setup (If Local MongoDB is Not Installed)

If you cannot install MongoDB locally, you can use the free **MongoDB Atlas** cloud tier:

1. Sign up at `https://www.mongodb.com/cloud/atlas` and create a free **M0 Sandbox** cluster.
2. Create a Database User (username and password) under **Database Access**.
3. Allow your IP address (or `0.0.0.0/0` for student demo testing) under **Network Access**.
4. Click **Connect -> Drivers**, copy your connection string, and update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/dbuu_placement_portal?retryWrites=true&w=majority
   ```

## 3. Seeding Demo Data

Make sure dependencies are installed (`npm --prefix backend install`) and `.env` is configured, then run:

```powershell
node database/seed.js
```

> **Note:** Running `seed.js` clears existing portal collections and inserts clean demo accounts, companies, placement drives, skills, projects, certifications, and sample applications.
