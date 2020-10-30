package com.lucas.service;

import com.lucas.grpc.Empty;
import com.lucas.grpc.MutinyProtoServiceGrpc;
import com.lucas.grpc.People;
import io.smallrye.mutiny.Uni;

import javax.inject.Singleton;

@Singleton
public class GrpcProtoService extends MutinyProtoServiceGrpc.ProtoServiceImplBase {
    @Override
    public Uni<People> getPeople(Empty request) {
        return Uni.createFrom()
                  .item(() -> Util.peopleProto);
    }
}
