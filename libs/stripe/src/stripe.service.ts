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

  /**
   * Create or update Stripe customer with enriched user data
   * @param email Customer email address
   * @param userData User details from database
   * @returns Stripe customer ID
   */
  async createOrUpdateCustomer(
    email: string,
    userData: {
      userId: number;
      userUid: string;
      name?: string;
      phone?: string;
      role?: string;
      description?: string;
    }
  ): Promise<string> {
    try {
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        const customer = customers.data[0];
        await this.stripe.customers.update(customer.id, {
          name: userData.name,
          phone: userData.phone,
          description: userData.description,
          metadata: {
            userId: userData.userId.toString(),
            userUid: userData.userUid,
            userRole: userData.role,
            lastUpdated: new Date().toISOString(),
          },
        });
        return customer.id;
      }

      const customer = await this.stripe.customers.create({
        email,
        name: userData.name,
        phone: userData.phone,
        description: userData.description,
        metadata: {
          userId: userData.userId.toString(),
          userUid: userData.userUid,
          userRole: userData.role,
          createdAt: new Date().toISOString(),
        },
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating/updating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID with full details
   * @param customerId Stripe customer ID
   * @returns Customer object or null
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return 'deleted' in customer ? null : customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return null;
    }
  }

  /**
   * Get customer by user ID from metadata
   * @param userId Database user ID
   * @returns Customer object or null
   */
  async getCustomerByUserId(userId: number): Promise<Stripe.Customer | null> {
    try {
      const customers = await this.stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      return customers.data.length > 0 ? customers.data[0] : null;
    } catch (error) {
      console.error('Error searching customer:', error);
      return null;
    }
  }

  /**
   * List all payment methods for a customer
   * @param customerId Stripe customer ID
   * @returns Array of payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      console.error('Error listing payment methods:', error);
      return [];
    }
  }

  /**
   * Get default payment method for a customer
   * @param customerId Stripe customer ID
   * @returns Payment method or null
   */
  async getDefaultPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if ('deleted' in customer) return null;

      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
      if (!defaultPaymentMethodId) return null;

      return await this.stripe.paymentMethods.retrieve(defaultPaymentMethodId as string);
    } catch (error) {
      console.error('Error getting default payment method:', error);
      return null;
    }
  }

  /**
   * Remove payment method from customer
   * @param paymentMethodId Payment method ID to remove
   * @returns Success boolean
   */
  async removePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      console.error('Error removing payment method:', error);
      return false;
    }
  }

  /**
   * Set default payment method for customer
   * @param customerId Stripe customer ID
   * @param paymentMethodId Payment method ID
   * @returns Success boolean
   */
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      return true;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return false;
    }
  }

  /**
   * Get checkout session details
   * @param sessionId Checkout session ID
   * @returns Session object or null
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'payment_intent'],
      });
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      return null;
    }
  }

  /**
   * Get payment intent details
   * @param paymentIntentId Payment intent ID
   * @returns Payment intent or null
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return null;
    }
  }

  /**
   * List all charges for a customer
   * @param customerId Stripe customer ID
   * @param limit Maximum number of charges to retrieve
   * @returns Array of charges
   */
  async listCharges(customerId: string, limit: number = 10): Promise<Stripe.Charge[]> {
    try {
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit,
      });
      return charges.data;
    } catch (error) {
      console.error('Error listing charges:', error);
      return [];
    }
  }

  /**
   * Create a refund for a charge
   * @param chargeId Charge ID to refund
   * @param amount Amount in cents (optional, full refund if not specified)
   * @param reason Refund reason
   * @returns Refund object or null
   */
  async createRefund(
    chargeId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Stripe.Refund | null> {
    try {
      return await this.stripe.refunds.create({
        charge: chargeId,
        amount,
        reason,
      });
    } catch (error) {
      console.error('Error creating refund:', error);
      return null;
    }
  }

  /**
   * Check if payment method card is already added (prevent duplicates)
   * @param customerId Stripe customer ID
   * @param cardToken Card token from frontend
   * @returns Boolean indicating if card was added (true = duplicate, false = new card added)
   */
  async addCard(customerId: string, cardToken: string): Promise<boolean> {
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

      return false;
    } catch (error) {
      console.error('Error checking card:', error);
      throw error;
    }
  }
}
