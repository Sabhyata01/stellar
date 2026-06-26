#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_token(env: &Env, admin: &Address) -> Address {
    // Use the v1 API which returns Address directly
    #[allow(deprecated)]
    env.register_stellar_asset_contract(admin.clone())
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_create_scholarship() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);

    let id = client.create_scholarship(
        &admin,
        &String::from_str(&env, "STEM Excellence"),
        &String::from_str(&env, "For top STEM students"),
        &token,
        &10_000_000_000i128,
        &1_000_000_000i128,
    );
    assert_eq!(id, 1);
    assert_eq!(client.get_scholarship_count(), 1);

    let s = client.get_scholarship(&1);
    assert_eq!(s.name, String::from_str(&env, "STEM Excellence"));
    assert_eq!(s.total_fund, 10_000_000_000);
    assert_eq!(s.remaining_fund, 10_000_000_000);
    assert_eq!(s.per_student, 1_000_000_000);
    assert!(s.active);
}

#[test]
fn test_apply() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Merit Scholarship"),
        &String::from_str(&env, "Merit based"),
        &token,
        &5_000_000_000i128,
        &1_000_000_000i128,
    );

    let app_id = client.apply(&1, &student1);
    assert_eq!(app_id, 1);
    assert_eq!(client.get_application_count(), 1);

    let app = client.get_application(&1);
    assert_eq!(app.scholarship_id, 1);
    assert_eq!(app.student, student1);
    assert_eq!(app.status, 0);
}

#[test]
fn test_review_approve() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Arts Grant"),
        &String::from_str(&env, "For arts students"),
        &token,
        &3_000_000_000i128,
        &1_000_000_000i128,
    );
    client.apply(&1, &student1);
    client.review_application(&admin, &1, &true);

    let app = client.get_application(&1);
    assert_eq!(app.status, 1);
}

#[test]
fn test_review_reject() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Research Fund"),
        &String::from_str(&env, "Research grants"),
        &token,
        &3_000_000_000i128,
        &1_000_000_000i128,
    );
    client.apply(&1, &student1);
    client.review_application(&admin, &1, &false);

    let app = client.get_application(&1);
    assert_eq!(app.status, 2);
}

#[test]
fn test_fund_and_disburse() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let student = Address::generate(&env);

    client.initialize(&admin);

    // Create a Stellar Asset Contract token
    let token_addr = create_token(&env, &admin);

    // Admin creates scholarship with the token
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Token Scholarship"),
        &String::from_str(&env, "Scholarship with real token"),
        &token_addr,
        &5_000_000_000i128,
        &1_000_000_000i128,
    );

    // Use StellarAssetClient to mint tokens to admin
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&admin, &5_000_000_000i128);

    // Admin funds the scholarship contract
    client.fund_scholarship(&admin, &1, &5_000_000_000i128);

    // Check scholarship remaining_fund increased
    let s = client.get_scholarship(&1);
    assert_eq!(s.remaining_fund, 10_000_000_000i128);

    // Student applies
    client.apply(&1, &student);

    // Admin approves
    client.review_application(&admin, &1, &true);

    // Admin disburses
    client.disburse(&admin, &1);

    // Check application status is Disbursed
    let app = client.get_application(&1);
    assert_eq!(app.status, 3);

    // Check scholarship remaining_fund decreased by per_student
    let s = client.get_scholarship(&1);
    assert_eq!(s.remaining_fund, 9_000_000_000i128);

    // Check student received tokens
    let token_client = token::Client::new(&env, &token_addr);
    assert_eq!(token_client.balance(&student), 1_000_000_000i128);
}

#[test]
fn test_update_scholarship() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Original"),
        &String::from_str(&env, "Original desc"),
        &token,
        &5_000_000_000i128,
        &1_000_000_000i128,
    );

    client.update_scholarship(
        &admin,
        &1,
        &String::from_str(&env, "Updated"),
        &String::from_str(&env, "Updated desc"),
        &10_000_000_000i128,
        &2_000_000_000i128,
        &false,
    );

    let s = client.get_scholarship(&1);
    assert_eq!(s.name, String::from_str(&env, "Updated"));
    assert_eq!(s.total_fund, 10_000_000_000);
    assert_eq!(s.per_student, 2_000_000_000);
    assert!(!s.active);
}

#[test]
#[should_panic(expected = "scholarship not active")]
fn test_apply_inactive_scholarship() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Inactive"),
        &String::from_str(&env, "desc"),
        &token,
        &5_000_000_000i128,
        &1_000_000_000i128,
    );
    client.update_scholarship(
        &admin,
        &1,
        &String::from_str(&env, "Inactive"),
        &String::from_str(&env, "desc"),
        &5_000_000_000i128,
        &1_000_000_000i128,
        &false,
    );
    client.apply(&1, &student1);
}

#[test]
#[should_panic(expected = "already reviewed")]
fn test_review_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "desc"),
        &token,
        &3_000_000_000i128,
        &1_000_000_000i128,
    );
    client.apply(&1, &student1);
    client.review_application(&admin, &1, &true);
    client.review_application(&admin, &1, &false);
}

#[test]
#[should_panic(expected = "application not approved")]
fn test_disburse_not_approved() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "desc"),
        &token,
        &3_000_000_000i128,
        &1_000_000_000i128,
    );
    client.apply(&1, &student1);
    client.disburse(&admin, &1);
}

#[test]
fn test_multiple_scholarships_and_applications() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let student1 = Address::generate(&env);
    let student2 = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Scholarship A"),
        &String::from_str(&env, "First"),
        &token,
        &10_000_000_000i128,
        &2_000_000_000i128,
    );
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Scholarship B"),
        &String::from_str(&env, "Second"),
        &token,
        &5_000_000_000i128,
        &1_000_000_000i128,
    );

    assert_eq!(client.get_scholarship_count(), 2);

    let app1 = client.apply(&1, &student1);
    let app2 = client.apply(&2, &student1);
    let app3 = client.apply(&1, &student2);

    assert_eq!(app1, 1);
    assert_eq!(app2, 2);
    assert_eq!(app3, 3);
    assert_eq!(client.get_application_count(), 3);
}

#[test]
#[should_panic(expected = "not initialized")]
fn test_uninitialized() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.create_scholarship(
        &admin,
        &String::from_str(&env, "Nope"),
        &String::from_str(&env, "desc"),
        &admin,
        &100i128,
        &10i128,
    );
}
