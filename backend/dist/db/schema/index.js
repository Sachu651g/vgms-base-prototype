"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./branches"), exports);
__exportStar(require("./departments"), exports);
__exportStar(require("./users"), exports);
__exportStar(require("./visitors"), exports);
__exportStar(require("./visits"), exports);
__exportStar(require("./gate-passes"), exports);
__exportStar(require("./pass-approvals"), exports);
__exportStar(require("./hostel-movements"), exports);
__exportStar(require("./scan-logs"), exports);
__exportStar(require("./audit-logs"), exports);
__exportStar(require("./notifications"), exports);
__exportStar(require("./blacklist"), exports);
__exportStar(require("./night-out-requests"), exports);
//# sourceMappingURL=index.js.map