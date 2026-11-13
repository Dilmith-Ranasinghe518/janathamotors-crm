<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Turn audit_logs into a full activity log: a readable description plus where it came from.
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('description')->nullable()->after('action');
            $table->string('method', 10)->nullable()->after('changes');
            $table->string('path')->nullable()->after('method');
            $table->unsignedSmallInteger('status')->nullable()->after('path');
            $table->string('ip_address', 45)->nullable()->after('status');
            $table->string('user_agent', 512)->nullable()->after('ip_address');
            $table->index('created_at');
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['action']);
            $table->dropColumn(['description', 'method', 'path', 'status', 'ip_address', 'user_agent']);
        });
    }
};
