// import Company from "../models/Company.js";

// // Request ke saath company ka id jod deta hai: req.companyId
// export const attachCompany = async (req, res, next) => {
//   try {
//     let companyId = req.user.company;

//     // ⚠️ Agar User.js me `company` field nahi hai, to Company.js me jo
//     // owner wali field hai (owner / user / createdBy) wo yahan likho:
//     if (!companyId) {
//       const company = await Company.findOne({ owner: req.user._id }).select("_id");
//       companyId = company?._id;
//     }

//     if (!companyId) {
//       return res.status(400).json({ message: "Pehle company profile create karo" });
//     }

//     req.companyId = companyId;
//     next();
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
import Company from "../models/Company.js";

export const attachCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ owner: req.user._id });
    if (!company) {
      return res.status(400).json({ success: false, message: "Pehle company profile create karo" });
    }
    req.company = company;          // purane modules (contractor etc.) ke liye
    req.companyId = company._id;    // invoice, payment, payout ke liye
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default attachCompany;