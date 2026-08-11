// Required photo angles per authentication-intake category, per Hexxo's
// "Required Photo Angles for Digital Authentication" reference doc. Shared
// between the standalone authentication-request flow (authenticate.js) and
// the seller listing flow (seller.js) -- both ask for the same photos for
// the same category off this one source instead of two hand-maintained
// copies that could drift apart.
//
// Sneakers, "Bags & Leather Goods", and Apparel come straight from that
// doc's tables ("Sneakers & Footwear", "Luxury Handbags & Accessories", and
// "Apparel & Hype Streetwear" there, respectively). Trading Cards has no
// table in that doc. Luxury Shoes has no table either -- reuses Sneakers'
// angles rather than guessing new ones, since it's still footwear inspected
// the same structural way (profile views, size tag, insole stitching, heel,
// outsole, box label).
export const ANGLE_REQUIREMENTS = {
  "Trading Cards": [
    { id: "front", label: "Front View", type: "required" },
    { id: "label", label: "Front of Label", type: "required" },
    { id: "sticker", label: "Laser Sticker Front (Straight On)", type: "required" },
    { id: "upper-left-corner", label: "Front Corner (Upper Left)", type: "required" },
    { id: "upper-right-corner", label: "Front Corner (Upper Right)", type: "required" },
    { id: "lower-left-corner", label: "Front Corner (Lower Left)", type: "required" },
    { id: "lower-right-corner", label: "Front Corner (Lower Right)", type: "required" },
    { id: "back", label: "Back View", type: "required" },
    { id: "additional", label: "Additional Photo", type: "optional" },
  ],
  "Apparel": [
    { id: "neck-tag", label: "Neck Tag (Front & Back)", type: "required" },
    { id: "wash-tag", label: "Wash Tag & Care Labels", type: "required" },
    { id: "graphic", label: "Graphic / Embroidery Close-Up", type: "required" },
    { id: "zippers-drawcords", label: "Zippers & Drawcords", type: "required" },
    { id: "full-overview", label: "Full Overview (Laid Flat)", type: "required" },
    { id: "additional", label: "Additional Photo", type: "optional" },
  ],
  "Sneakers": [
    { id: "lateral-side", label: "Lateral Side (Full)", type: "required" },
    { id: "medial-side", label: "Medial Side (Full)", type: "required" },
    { id: "size-tag", label: "Size Tag / Interior Label", type: "required" },
    { id: "insole-stitching", label: "Insole Stitching (Footbed)", type: "required" },
    { id: "insole-top-bottom", label: "Insole Top & Bottom", type: "required" },
    { id: "heel-view", label: "Heel View (Rear)", type: "required" },
    { id: "outsole", label: "Outsole (Bottoms)", type: "required" },
    { id: "box-label", label: "Box Label & Packaging", type: "required" },
    { id: "additional", label: "Additional Photo", type: "optional" },
  ],
  "Bags & Leather Goods": [
    { id: "front-back-bottom", label: "Front, Back & Bottom", type: "required" },
    { id: "heat-stamp", label: "Heat Stamp / Brand Logo", type: "required" },
    { id: "serial-code", label: "Serial Code / Date Code", type: "required" },
    { id: "hardware-engravings", label: "Hardware Engravings", type: "required" },
    { id: "zipper-mechanism", label: "Zipper Mechanism & Underside", type: "required" },
    { id: "stitching-closeup", label: "Stitching Close-Up", type: "required" },
    { id: "additional", label: "Additional Photo", type: "optional" },
  ],
};
ANGLE_REQUIREMENTS["Luxury Shoes"] = ANGLE_REQUIREMENTS["Sneakers"];

export function getRequiredAngleCount(category) {
  return (ANGLE_REQUIREMENTS[category] || []).filter(a => a.type === 'required').length;
}
