export type User = {
  email: string
  managerEmail: string | null
};

type email = string;
/**
 * Map of email to User
 */
export type UserByEmail = Map<email, User>;

export type UserDiff = {
  lhsEmail: email | null
  rhsEmail: email | null
  lhsManagerEmail: email | null
  rhsManagerEmail: email | null
};

export type UserDiffByUser = Map<email, UserDiff>;

export function compare(lhs: UserByEmail, rhs: UserByEmail) : UserDiffByUser {
  const userDiffs = new Map<email, UserDiff>();

  for(const lhsUser of lhs.values()) {
    const rhsUser = rhs.get(lhsUser.email);
    // In lhs but not rhs
    if(!rhsUser) {
      userDiffs.set(lhsUser.email, {
        lhsEmail: lhsUser.email,
        rhsEmail: null,
        lhsManagerEmail: lhsUser.managerEmail,
        rhsManagerEmail: null
      });
    } else {
      // In both but manager different
      if(lhsUser.managerEmail !== rhsUser.managerEmail) {
        userDiffs.set(lhsUser.email, {
          lhsEmail: lhsUser.email,
          rhsEmail: rhsUser.email,
          lhsManagerEmail: lhsUser.managerEmail,
          rhsManagerEmail: rhsUser.managerEmail
        });
      }
    }
  }

  for(const rhsUser of rhs.values()) {
    // In rhs but not lhs
    const lhsUser = lhs.get(rhsUser.email);
    if(!lhsUser) {
      userDiffs.set(rhsUser.email, {
        lhsEmail: null,
        rhsEmail: rhsUser.email,
        lhsManagerEmail: null,
        rhsManagerEmail: rhsUser.managerEmail
      });
    } else {
      // In both but manager different
      if(lhsUser.managerEmail !== rhsUser.managerEmail) {
        if(!userDiffs.has(lhsUser.email)) {
          userDiffs.set(lhsUser.email, {
            lhsEmail: lhsUser.email,
            rhsEmail: rhsUser.email,
            lhsManagerEmail: lhsUser.managerEmail,
            rhsManagerEmail: rhsUser.managerEmail
          });
        }
      }
    }
  }

  return userDiffs;
}

