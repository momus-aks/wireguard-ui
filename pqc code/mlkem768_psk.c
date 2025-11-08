#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <oqs/oqs.h>

static void hex_print(const uint8_t *data, size_t len) {
    for (size_t i = 0; i < len; i++) {
        printf("%02x", data[i]);
    }
    printf("\n");
}

int main(void) {
    OQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_ml_kem_768);
    if (kem == NULL) {
        fprintf(stderr, "Failed to initialise ML-KEM-768\n");
        return EXIT_FAILURE;
    }

    uint8_t *public_key = OQS_MEM_malloc(kem->length_public_key);
    uint8_t *secret_key = OQS_MEM_malloc(kem->length_secret_key);
    uint8_t *ciphertext = OQS_MEM_malloc(kem->length_ciphertext);
    uint8_t *shared_secret_client = OQS_MEM_malloc(kem->length_shared_secret);
    uint8_t *shared_secret_server = OQS_MEM_malloc(kem->length_shared_secret);

    if (!public_key || !secret_key || !ciphertext ||
        !shared_secret_client || !shared_secret_server) {
        fprintf(stderr, "Memory allocation failed\n");
        return EXIT_FAILURE;
    }

    if (OQS_KEM_keypair(kem, public_key, secret_key) != OQS_SUCCESS) {
        fprintf(stderr, "Keypair generation failed\n");
        return EXIT_FAILURE;
    }

    if (OQS_KEM_encaps(kem, ciphertext, shared_secret_client, public_key) != OQS_SUCCESS) {
        fprintf(stderr, "Encapsulation failed\n");
        return EXIT_FAILURE;
    }

    if (OQS_KEM_decaps(kem, shared_secret_server, ciphertext, secret_key) != OQS_SUCCESS) {
        fprintf(stderr, "Decapsulation failed\n");
        return EXIT_FAILURE;
    }

    if (OQS_MEM_secure_cmp(shared_secret_client, shared_secret_server,
                           kem->length_shared_secret) != OQS_SUCCESS) {
        fprintf(stderr, "Shared secrets do not match\n");
        return EXIT_FAILURE;
    }

    /* Truncate to 32 bytes for WireGuard PSK usage */
    size_t psk_len = kem->length_shared_secret < 32 ? kem->length_shared_secret : 32;
    hex_print(shared_secret_client, psk_len);

    OQS_MEM_secure_free(shared_secret_client, kem->length_shared_secret);
    OQS_MEM_secure_free(shared_secret_server, kem->length_shared_secret);
    OQS_MEM_secure_free(secret_key, kem->length_secret_key);
    OQS_MEM_insecure_free(public_key);
    OQS_MEM_insecure_free(ciphertext);
    OQS_KEM_free(kem);

    return EXIT_SUCCESS;
}

