import { getStoredUser } from "./roles";

const vendorCode = [
    "AMG6864", "AMG6865", "AMG6866", "AMG6867",
]

export const isSiteVendor = () => {
    const user = getStoredUser();
    return vendorCode.includes(user?.vendor_code);
};

/** Calendar Daily wage type is enabled only for this org code. */
export const CALENDAR_DAILY_VENDOR_CODES = ["AMG6867"];

export const canUseCalendarDailyPay = (user = getStoredUser()) => {
    const code = String(user?.vendor_code || user?.vendorCode || "").toUpperCase();
    return CALENDAR_DAILY_VENDOR_CODES.includes(code);
};