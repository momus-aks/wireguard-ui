#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <oqs/oqs.h>

#define PORT 9000
#define SERVER_IP "192.168.1.2"  // Replace with Peer B's IP

int main() {
    OQS_KEM *kem = OQS_KEM_new(OQS_KEM_alg_ml_kem_768);
    if (!kem) {
        fprintf(stderr, "Failed to init ML-KEM-768\n");
        return EXIT_FAILURE;
    }

    uint8_t *public_key = OQS_MEM_malloc(kem->length_public_key);
    uint8_t *ciphertext = OQS_MEM_malloc(kem->length_ciphertext);
    uint8_t *shared_secret = OQS_MEM_malloc(kem->length_shared_secret);

    if (!public_key || !ciphertext || !shared_secret) {
        fprintf(stderr, "Memory allocation failed\n");
        return EXIT_FAILURE;
    }

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in serv_addr = { .sin_family = AF_INET, .sin_port = htons(PORT) };
    inet_pton(AF_INET, SERVER_IP, &serv_addr.sin_addr);
    connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr));
    printf("[Client] Connected to server.\n");

    // Receive public key
    recv(sock, public_key, kem->length_public_key, MSG_WAITALL);

    // Encapsulate
    if (OQS_KEM_encaps(kem, ciphertext, shared_secret, public_key) != OQS_SUCCESS) {
        fprintf(stderr, "Encapsulation failed\n");
        return EXIT_FAILURE;
    }

    // Send ciphertext
    send(sock, ciphertext, kem->length_ciphertext, 0);

    FILE *psk = fopen("pqc_psk.key", "wb");
    fwrite(shared_secret, 1, 32, psk);
    fclose(psk);
    printf("[Client] Shared secret saved to pqc_psk.key\n");

    close(sock);
    OQS_MEM_secure_free(shared_secret, kem->length_shared_secret);
    OQS_MEM_insecure_free(public_key);
    OQS_MEM_insecure_free(ciphertext);
    OQS_KEM_free(kem);
    return 0;
}
