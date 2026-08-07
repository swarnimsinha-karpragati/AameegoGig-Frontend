import { getStoredUser } from "./roles";

const vendorCode = [
    "AMG2144",
]

export const isSiteVendor = () => {
    const user = getStoredUser();
    return vendorCode.includes(user?.vendor_code);
};