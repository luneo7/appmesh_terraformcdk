package com.lucas.service;

import com.lucas.dto.People;
import io.smallrye.mutiny.Uni;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

@RegisterRestClient(baseUri = "http://mango.mesh.local:8080")
@ApplicationScoped
public interface PeopleService {
    @GET
    @Path("/people")
    @Produces("application/json")
    Uni<People> getPeople();
}
