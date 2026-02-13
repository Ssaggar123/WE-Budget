router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid Email" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        const token = jwt.sign({ id: user._id }, "secretKey", { expiresIn: "1d" });

        res.json({
            message: "Login Successful",
            token,
            user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;