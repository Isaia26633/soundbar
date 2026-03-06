/**
 * Auth Middleware
 * Checks that the user is logged in via Formbar OAuth session.
 * Rejects expired JWT tokens and redirects/401s accordingly.
 */

function isAuthenticated(req, res, next) {
    if (!req.session.user) {
        if (req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }

    const tokenData = req.session.token;

    try {
        const currentTime = Math.floor(Date.now() / 1000);
        if (tokenData?.exp < currentTime) {
            throw new Error('Token has expired');
        }
        next();
    } catch (err) {
        req.session.destroy();
        if (req.headers.accept?.includes('application/json')) {
            res.status(401).json({ error: 'Unauthorized' });
        } else {
            res.redirect('/login');
        }
    }
}

module.exports = { isAuthenticated };
