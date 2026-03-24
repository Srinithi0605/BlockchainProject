// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityVerification {
    struct VerificationRecord {
        string hash;
        bool status;
    }

    mapping(address => VerificationRecord) private records;

    event VerificationStored(address indexed user, string hash, bool status);

    function storeVerification(string calldata hash, bool status) external {
        records[msg.sender] = VerificationRecord({hash: hash, status: status});
        emit VerificationStored(msg.sender, hash, status);
    }

    function getVerification(address user) external view returns (string memory, bool) {
        VerificationRecord memory record = records[user];
        return (record.hash, record.status);
    }
}
