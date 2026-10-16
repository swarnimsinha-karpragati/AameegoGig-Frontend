import API from "./apiClient";

const dataOf = (response) => response.data?.data;

/** -> { enabled, personalData }: which AI features the app may show. */
export const getAiStatus = async () => dataOf(await API.get("/ai/status"));

/** Settings → Configuration (admins) -> { enabled, personalData, monthlyBudgetUsd, usedThisMonthUsd } */
export const getAiSettings = async () => dataOf(await API.get("/ai/settings"));

export const updateAiSettings = async (payload) => (await API.put("/ai/settings", payload)).data;
