const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
const dbPath = path.join(__dirname, "userData.db");
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Register User API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
        SELECT * 
        FROM user
        WHERE username = '${username}';
  `;
  const dbUser = await db.get(selectUserQuery);

  if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else if (dbUser === undefined) {
    const createUserQuery = `
            INSERT INTO 
                user (username, name, password, gender, location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );
        `;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//  Login User API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
        SELECT * 
        FROM user
        WHERE username = '${username}';
  `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change/Update Password API

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
        SELECT *
        FROM user
        WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched !== true) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const changePasswordQuery = `
              UPDATE
                  user
              SET
                  username = '${username}',
                  name = '${dbUser.name}',
                  password = '${newHashedPassword}',
                  gender = '${dbUser.gender}',
                  location = '${dbUser.location}'
              WHERE
                  username = '${username}';
          `;
        await db.run(changePasswordQuery);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
