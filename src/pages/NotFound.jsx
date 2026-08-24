import { Link } from "react-router-dom";
import { getStoredUser } from "../utils/roles";
import "./NotFound.css";

const NotFound = () => {
    const user = getStoredUser();

    const vendorname =
        user?.vendorName?.trim()?.replace(/\s+/g, "-").toLowerCase() || "";

    return (
        <div className="not-found-page">
            <div className="not-found-bg-circle not-found-bg-circle--one" />
            <div className="not-found-bg-circle not-found-bg-circle--two" />
            <div className="not-found-content">
                <h1 className="not-found-number">
                    404
                </h1>

                <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-900">
                    Page Not Found
                </h2>

                <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-md mx-auto">
                    Sorry, the page you are looking for doesn't exist or may have
                    been moved.
                </p>

                <Link
                    to={`/${vendorname}/dashboard`}
                    className="dashboard-btn"
                >
                    <span>←</span>
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default NotFound;