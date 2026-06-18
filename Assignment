<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Form</title>
</head>
<body>
    <h2>Registration Form</h2>

    <form onsubmit="return checkData()">
        <input type="text" id="userName" placeholder="Enter Name">
        <br><br>

        <input type="email" id="userEmail" placeholder="Enter Email">
        <br><br>

        <input type="password" id="userPass" placeholder="Enter Password">
        <br><br>

        <button type="submit">Register</button>
    </form>

    <script>
        function checkData() {
            let n = document.getElementById("userName").value.trim();
            let e = document.getElementById("userEmail").value.trim();
            let p = document.getElementById("userPass").value;

            if (n === "" || e === "" || p === "") {
                alert("Please fill all fields");
                return false;
            }

            if (p.length < 8) {
                alert("Password should contain at least 8 characters");
                return false;
            }

            if (!e.includes("@") || !e.includes(".")) {
                alert("Please enter a valid email");
                return false;
            }

            alert("Registration Successful");
            return true;
        }
    </script>
</body>
</html>
