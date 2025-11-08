#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <oqs/oqs.h>

#define PORT 9000

int main() {
    OQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_ml_kem_768);
    if (!kem) {
        fprintf(stderr, "Failed to init ML-KEM-768\n");
        return EXIT_FAILURE;
    }

    uint8_t *public_key = OQS_MEM_malloc(kem->length_public_key);
    uint8_t *secret_key = OQS_MEM_malloc(kem->length_secret_key);
    uint8_t *ciphertext = OQS_MEM_malloc(kem->length_ciphertext);
    uint8_t *shared_secret = OQS_MEM_malloc(kem->length_shared_secret);

    if (!public_key || !secret_key || !ciphertext || !shared_secret) {
        fprintf(stderr, "Memory allocation failed\n");
        return EXIT_FAILURE;
    }

    if (OQS_KEM_keypair(kem, public_key, secret_key) != OQS_SUCCESS) {
        fprintf(stderr, "Keypair generation failed\n");
        return EXIT_FAILURE;
    }

    // Set up server socket
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = { .sin_family = AF_INET, .sin_addr.s_addr = INADDR_ANY, .sin_port = htons(PORT) };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 1);
    printf("[Server] Waiting for connection...\n");

    int client_fd = accept(server_fd, NULL, NULL);
    printf("[Server] Connected.\n");

    // Send public key
    send(client_fd, public_key, kem->length_public_key, 0);

    // Receive ciphertext
    recv(client_fd, ciphertext, kem->length_ciphertext, MSG_WAITALL);

    if (OQS_KEM_decaps(kem, shared_secret, ciphertext, secret_key) != OQS_SUCCESS) {
        fprintf(stderr, "Decapsulation failed\n");
        return EXIT_FAILURE;
    }

    FILE *psk = fopen("pqc_psk.key", "wb");
    fwrite(shared_secret, 1, 32, psk);
    fclose(psk);
    printf("[Server] Shared secret saved to pqc_psk.key\n");

    close(client_fd); close(server_fd);
    OQS_MEM_secure_free(secret_key, kem->length_secret_key);
    OQS_MEM_secure_free(shared_secret, kem->length_shared_secret);
    OQS_MEM_insecure_free(public_key);
    OQS_MEM_insecure_free(ciphertext);
    OQS_KEM_free(kem);
    return 0;
}
