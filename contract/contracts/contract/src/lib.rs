#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct Scholarship {
    pub id: u64,
    pub name: String,
    pub description: String,
    pub token: Address,
    pub total_fund: i128,
    pub remaining_fund: i128,
    pub per_student: i128,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Application {
    pub id: u64,
    pub scholarship_id: u64,
    pub student: Address,
    pub status: u32, // 0=Pending 1=Approved 2=Rejected 3=Disbursed
}

#[contracttype]
pub enum DataKey {
    Admin,
    Scholarship(u64),
    Application(u64),
    ScholarshipCount,
    ApplicationCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn initialize(env: Env, admin: Address) {
        assert!(!env.storage().instance().has(&DataKey::Admin), "already initialized");
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn create_scholarship(
        env: Env,
        admin: Address,
        name: String,
        description: String,
        token: Address,
        total_fund: i128,
        per_student: i128,
    ) -> u64 {
        admin.require_auth();
        Self::check_admin(&env, &admin);
        let mut count: u64 = env.storage().instance().get(&DataKey::ScholarshipCount).unwrap_or(0);
        count += 1;
        let scholarship = Scholarship {
            id: count,
            name,
            description,
            token,
            total_fund,
            remaining_fund: total_fund,
            per_student,
            active: true,
        };
        env.storage().persistent().set(&DataKey::Scholarship(count), &scholarship);
        env.storage().instance().set(&DataKey::ScholarshipCount, &count);
        count
    }

    pub fn update_scholarship(
        env: Env,
        admin: Address,
        id: u64,
        name: String,
        description: String,
        total_fund: i128,
        per_student: i128,
        active: bool,
    ) {
        admin.require_auth();
        Self::check_admin(&env, &admin);
        let mut s = Self::read_scholarship(&env, id);
        s.name = name;
        s.description = description;
        s.total_fund = total_fund;
        s.per_student = per_student;
        s.active = active;
        env.storage().persistent().set(&DataKey::Scholarship(id), &s);
    }

    pub fn apply(env: Env, scholarship_id: u64, student: Address) -> u64 {
        student.require_auth();
        let s = Self::read_scholarship(&env, scholarship_id);
        assert!(s.active, "scholarship not active");
        assert!(s.remaining_fund >= s.per_student, "insufficient funds");
        let mut count: u64 = env.storage().instance().get(&DataKey::ApplicationCount).unwrap_or(0);
        count += 1;
        let app = Application { id: count, scholarship_id, student, status: 0 };
        env.storage().persistent().set(&DataKey::Application(count), &app);
        env.storage().instance().set(&DataKey::ApplicationCount, &count);
        count
    }

    pub fn review_application(env: Env, admin: Address, application_id: u64, approve: bool) {
        admin.require_auth();
        Self::check_admin(&env, &admin);
        let mut app = Self::read_application(&env, application_id);
        assert!(app.status == 0, "already reviewed");
        app.status = if approve { 1 } else { 2 };
        env.storage().persistent().set(&DataKey::Application(application_id), &app);
    }

    pub fn fund_scholarship(env: Env, from: Address, scholarship_id: u64, amount: i128) {
        from.require_auth();
        let mut s = Self::read_scholarship(&env, scholarship_id);
        let c = token::Client::new(&env, &s.token);
        c.transfer(&from, &env.current_contract_address(), &amount);
        s.remaining_fund += amount;
        env.storage().persistent().set(&DataKey::Scholarship(scholarship_id), &s);
    }

    pub fn disburse(env: Env, admin: Address, application_id: u64) {
        admin.require_auth();
        Self::check_admin(&env, &admin);
        let mut app = Self::read_application(&env, application_id);
        assert!(app.status == 1, "application not approved");
        let mut s = Self::read_scholarship(&env, app.scholarship_id);
        assert!(s.remaining_fund >= s.per_student, "insufficient funds");
        let c = token::Client::new(&env, &s.token);
        c.transfer(&env.current_contract_address(), &app.student, &s.per_student);
        s.remaining_fund -= s.per_student;
        app.status = 3;
        env.storage().persistent().set(&DataKey::Scholarship(app.scholarship_id), &s);
        env.storage().persistent().set(&DataKey::Application(application_id), &app);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }

    pub fn get_scholarship(env: Env, id: u64) -> Scholarship {
        Self::read_scholarship(&env, id)
    }

    pub fn get_application(env: Env, id: u64) -> Application {
        Self::read_application(&env, id)
    }

    pub fn get_scholarship_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::ScholarshipCount).unwrap_or(0)
    }

    pub fn get_application_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::ApplicationCount).unwrap_or(0)
    }

    fn read_scholarship(env: &Env, id: u64) -> Scholarship {
        env.storage().persistent().get(&DataKey::Scholarship(id)).expect("scholarship not found")
    }

    fn read_application(env: &Env, id: u64) -> Application {
        env.storage().persistent().get(&DataKey::Application(id)).expect("application not found")
    }

    fn check_admin(env: &Env, admin: &Address) {
        let stored: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        assert!(&stored == admin, "unauthorized");
    }
}

mod test;
