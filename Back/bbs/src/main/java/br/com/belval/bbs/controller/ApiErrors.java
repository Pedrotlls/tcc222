package br.com.belval.bbs.controller;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
/** Nao expor SQL ou rastros de pilha. */
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> known(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",
            e.getReason() == null ? "Requisicao invalida." : e.getReason()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
            "Registro duplicado ou vinculado a outros dados."));
    }
}
