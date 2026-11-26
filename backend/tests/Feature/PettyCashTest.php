<?php

namespace Tests\Feature;

use App\Models\PettyCashRequest;
use App\Models\PettyCashTopUp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PettyCashTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolePermissionSeeder']);
    }
    public function test_staff_can_request_petty_cash()
    {
        $staff = User::factory()->create();
        $staff->assignRole('Staff');

        $response = $this->actingAs($staff)->postJson('/api/petty-cash', [
            'amount' => 1250.00,
            'category' => 'Tea & Refreshments',
            'description' => 'Tea for visiting mechanics',
            'expense_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('petty_cash_requests', [
            'amount' => 1250.00,
            'category' => 'Tea & Refreshments',
            'status' => 'pending',
            'user_id' => $staff->id,
        ]);
    }

    public function test_finance_admin_can_approve_petty_cash()
    {
        $staff = User::factory()->create();
        $staff->assignRole('Staff');

        $financeAdmin = User::factory()->create();
        $financeAdmin->assignRole('Finance Admin');

        $req = PettyCashRequest::create([
            'voucher_no' => PettyCashRequest::nextVoucherNo(),
            'user_id' => $staff->id,
            'amount' => 500.00,
            'category' => 'Cleaning & Sanitation',
            'description' => 'Mop and soap',
            'expense_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($financeAdmin)->postJson("/api/petty-cash/{$req->id}/approve", [
            'approval_notes' => 'Approved by Finance Team',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('approved', $req->fresh()->status);
        $this->assertEquals($financeAdmin->id, $req->fresh()->approved_by);
    }

    public function test_finance_admin_can_top_up_and_disburse()
    {
        $financeAdmin = User::factory()->create();
        $financeAdmin->assignRole('Finance Admin');

        // Top up float
        $topUpRes = $this->actingAs($financeAdmin)->postJson('/api/petty-cash/top-up', [
            'amount' => 20000.00,
            'source' => 'Bank Withdrawal',
            'reference_no' => 'CHQ-1001',
        ]);
        $topUpRes->assertStatus(201);

        // Create approved request
        $req = PettyCashRequest::create([
            'voucher_no' => PettyCashRequest::nextVoucherNo(),
            'user_id' => $financeAdmin->id,
            'amount' => 3000.00,
            'category' => 'Fuel & Transport',
            'description' => 'Van fuel for delivery',
            'expense_date' => now()->toDateString(),
            'status' => 'approved',
            'approved_by' => $financeAdmin->id,
            'approved_at' => now(),
        ]);

        // Disburse
        $disburseRes = $this->actingAs($financeAdmin)->postJson("/api/petty-cash/{$req->id}/disburse", [
            'payment_method' => 'Cash',
            'payment_notes' => 'Paid from drawer',
        ]);
        $disburseRes->assertStatus(200);
        $this->assertEquals('paid', $req->fresh()->status);

        // Check summary endpoint
        $summaryRes = $this->actingAs($financeAdmin)->getJson('/api/petty-cash/summary');
        $summaryRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(17000.00, $summaryRes->json('current_balance'));
    }
}
