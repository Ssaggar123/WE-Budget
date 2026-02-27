session.defaultSession.cookies.flushStore();
res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false
});