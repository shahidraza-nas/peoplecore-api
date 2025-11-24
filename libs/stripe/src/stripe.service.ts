import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  public stripe: Stripe;
  public constructor(private _config: ConfigService) {
    this.stripe = new Stripe(this._config.get('stripe').apiKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  // Add business-specific helper methods here if needed
  // Example: card management, customer helpers, etc.
  async addCard(customerId, cardToken) {
    try {
      // Step 1: Create a payment method from the card token temporarily
      const tempPaymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: { token: cardToken },
      });

      // Step 2: Retrieve existing payment methods for the customer
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // Step 3: Compare fingerprints of payment methods
      for (const paymentMethod of paymentMethods.data) {
        if (
          paymentMethod.card.fingerprint === tempPaymentMethod.card.fingerprint
        ) {
          // Step 4: Detach the temporary payment method
          // await this.stripe.paymentMethods.detach(tempPaymentMethod.id);

          return true; // Card is already added
        }
      }

      // If no match was found, keep the new payment method and attach it to the customer
      await this.stripe.paymentMethods.attach(tempPaymentMethod.id, {
        customer: customerId,
      });

      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: tempPaymentMethod.id,
        },
      });

      return false; // Card is not added, now it is attached to the customer
    } catch (error) {
      console.error('Error checking card:', error);
      throw error; // Handle error appropriately
    }
  }
}
