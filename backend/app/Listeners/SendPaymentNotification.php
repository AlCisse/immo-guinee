<?php

namespace App\Listeners;

use App\Events\PaymentConfirmed;
use App\Notifications\PaymentConfirmedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendPaymentNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     * FR-044: Send payment confirmation notification to both parties
     */
    public function handle(PaymentConfirmed $event): void
    {
        Log::info('Sending payment confirmation notifications', [
            'payment_id' => $event->payment->id,
        ]);

        // Notify payeur (payer)
        if ($event->payment->payeur) {
            $event->payment->payeur->notify(new PaymentConfirmedNotification($event->payment));
        }

        // Notify beneficiaire (beneficiary)
        if ($event->payment->beneficiaire) {
            $event->payment->beneficiaire->notify(new PaymentConfirmedNotification($event->payment));
        }

        Log::info('Payment confirmation notifications sent', [
            'payment_id' => $event->payment->id,
        ]);
    }
}
