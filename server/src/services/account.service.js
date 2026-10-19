import { hash, verify } from "@node-rs/argon2";
import {
  findAccountForLogin,
  findAccountWithPassword,
  insertAccount,
  markAccountPhoneVerified,
  saveAccountPassword,
  updateAccountProfile,
} from "../repositories/account.repository.js";
import { appendAuditLog } from "../repositories/audit.repository.js";
import {
  checkPhoneVerification,
  startPhoneVerification,
} from "./phone-verification.service.js";

export async function registerAccount(details) {
  const account = await insertAccount({
    fullName: details.fullName,
    email: details.email,
    phone: details.phone,
    passwordHash: await hash(details.password),
  });
  const delivery = await startPhoneVerification(details.phone, "USER", account.id);
  return { account, delivery };
}

export async function authenticateAccount(email, password) {
  const account = await findAccountForLogin(email.toLowerCase());
  if (
    !account ||
    !account.isActive ||
    !(await verify(account.passwordHash, password))
  ) {
    return null;
  }
  return account;
}

export async function verifyAccountPhone(account, code) {
  if (!(await checkPhoneVerification(account.phone, code, "USER", account.id))) {
    return false;
  }

  await markAccountPhoneVerified(account.id);
  await appendAuditLog(
    account.id,
    "PHONE_VERIFIED",
    "user",
    account.id,
  );
  return true;
}

export const resendAccountVerification = (account) =>
  startPhoneVerification(account.phone, "USER", account.id);

export async function updateAccount(account, values) {
  const changes = { ...values };
  let delivery;
  if (changes.phone && changes.phone !== account.phone) {
    changes.phoneVerified = false;
    delivery = await startPhoneVerification(changes.phone, "USER", account.id);
  }

  const updatedAccount = await updateAccountProfile(account.id, changes);
  return { account: updatedAccount, delivery };
}

export async function changeAccountPassword(accountId, currentPassword, newPassword) {
  const account = await findAccountWithPassword(accountId);
  if (!account || !(await verify(account.passwordHash, currentPassword))) return false;

  await saveAccountPassword(accountId, await hash(newPassword));
  return true;
}
