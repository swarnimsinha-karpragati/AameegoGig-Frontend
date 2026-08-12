import { getStoredUser } from "./roles";

const vendorCode = [
    "AMG6864"
]

export const isSiteVendor = () => {
    const user = getStoredUser();
    return vendorCode.includes(user?.vendor_code);
};