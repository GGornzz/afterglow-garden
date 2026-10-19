
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'กรุณาเข้าสู่ระบบก่อน'
        });
    }

    next();
}

module.exports = { requireAuth };
