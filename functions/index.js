const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {randomInt} = require("node:crypto");

initializeApp();

const db = getFirestore();
const YEAR = 2026;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a random voter code for the 2026 voting edition.
 * @return {string} A unique-format voter code.
 */
function makeCode() {
  let suffix = "";

  for (let i = 0; i < 8; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `BDR26-${suffix}`;
}

/**
 * Verifies that the caller is an authorised administrator.
 * @param {object} request The callable function request.
 * @return {Promise<void>} Resolves when the caller is authorised.
 */
async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Sign in before performing this action.",
    );
  }

  const adminSnap = await db
      .collection("admins")
      .doc(request.auth.uid)
      .get();

  if (!adminSnap.exists || adminSnap.data().role !== "admin") {
    throw new HttpsError(
        "permission-denied",
        "Administrator access is required.",
    );
  }
}

exports.generateVoterCodes = onCall(
    {maxInstances: 3},
    async (request) => {
      await requireAdmin(request);

      const count = request.data && request.data.count;

      if (!Number.isInteger(count) || count < 1 || count > 100) {
        throw new HttpsError(
            "invalid-argument",
            "Choose a batch size between 1 and 100.",
        );
      }

      const createdCodes = [];

      // Create each code transactionally to avoid overwriting
      // an existing code if a generated ID happens to collide.
      for (let i = 0; i < count; i += 1) {
        let savedCode = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const code = makeCode();
          const codeRef = db.collection("voterCodes").doc(code);

          try {
            await db.runTransaction(async (transaction) => {
              const existing = await transaction.get(codeRef);

              if (existing.exists) {
                throw new Error("CODE_COLLISION");
              }

              transaction.create(codeRef, {
                year: YEAR,
                status: "available",
                createdAt: FieldValue.serverTimestamp(),
                createdBy: request.auth.uid,
              });
            });

            savedCode = code;
            break;
          } catch (error) {
            if (error.message !== "CODE_COLLISION") {
              throw error;
            }
          }
        }

        if (!savedCode) {
          throw new HttpsError(
              "internal",
              "Could not create a unique code. Please try again.",
          );
        }

        createdCodes.push(savedCode);
      }

      return {
        year: YEAR,
        count: createdCodes.length,
        codes: createdCodes,
      };
    },
);
